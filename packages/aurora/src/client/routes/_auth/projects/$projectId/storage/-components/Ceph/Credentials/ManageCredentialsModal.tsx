import { useEffect, useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  FormSection,
  Message,
  Status,
  Button,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Spinner,
  toast,
} from "@cloudoperators/juno-ui-components"
import { EC2_CREDENTIALS_MAX_PER_PROJECT, EC2_CREDENTIAL_LIMIT_REACHED } from "@/server/Storage/constants"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import ClipboardText from "@/client/components/ClipboardText"
import { getCredentialCreatedToast, getCredentialDeletedToast } from "./CredentialToastNotifications"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { invalidateCredentialQueries } from "../hooks/invalidateCredentialQueries"

interface ManageCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Lets the user see/create/delete their own EC2 (S3) credentials in this project, plus the
 * connection details (endpoint/region) any S3 client needs alongside them.
 *
 * Secrets are shown outright rather than behind a reveal control: every key here belongs to the
 * caller, and `resolveEC2Credential` already reads the same secret on every Ceph request. They
 * are still fetched one key at a time through the `reveal` mutation instead of being folded into
 * `list`, so nothing puts them in the TanStack Query cache.
 *
 * Mounted once, outside every early `return` in `CephBuckets` (see index.tsx): deleting the last
 * credential flips the page underneath into the `NO_CEPH_CREDENTIALS` branch, and the modal must
 * survive that transition instead of being unmounted mid-operation.
 */
export const ManageCredentialsModal = ({ isOpen, onClose }: ManageCredentialsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  // Opening this modal is a read (list credentials, show connection details) - reads are
  // deliberately never gated in this codebase (see the useCephPermissions docblock). Only the
  // mutations inside (create/delete) are gated below.
  const { permissions, isLoading: isLoadingPermissions, isError: isPermissionsError } = useCephPermissions(projectId)

  const {
    data: credentials = [],
    isLoading: isLoadingCredentials,
    error: listError,
  } = trpcReact.storage.ceph.ec2Credentials.list.useQuery(
    { project_id: projectId ?? "" },
    { enabled: isOpen && !!projectId, retry: false }
  )

  // staleTime: Infinity - endpoint/region are deployment constants, not per-session state.
  const { data: s3Status, error: statusError } = trpcReact.storage.ceph.containers.status.useQuery(
    { project_id: projectId ?? "" },
    { enabled: isOpen && !!projectId, retry: false, staleTime: Infinity }
  )

  // This modal stays mounted after it closes (see the docblock above), and neither `reset()` nor
  // `onClose` aborts a request that is already in flight — its `onSuccess` still runs. Reading the
  // current open state through a ref lets a late completion tell that the modal is gone, so it
  // can't write a secret back into the state `handleClose` just cleared.
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [failedSecretIds, setFailedSecretIds] = useState<Record<string, true>>({})
  // Which row is mid-delete. The ref is what the mutation callbacks read: they can run in the same
  // tick as the click that started them, before a state update has been rendered.
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deletingIdRef = useRef<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Ids whose secret has already been asked for during this opening, successfully or not. Without
  // it a failed fetch would be retried on every render, and the key created below — whose secret
  // `createMutation.onSuccess` already has — would be fetched a second time once `list` refetches.
  const requestedSecretIds = useRef<Set<string>>(new Set())

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.credentials.manage",
  })

  // Mutation, not a query, on purpose: a query result lands in the TanStack Query cache, where
  // the secret would survive the modal closing and show up in devtools. See the server-side
  // docblock on `ec2Credentials.reveal` for the full rationale.
  const revealMutation = trpcReact.storage.ceph.ec2Credentials.reveal.useMutation()
  const revealSecret = revealMutation.mutateAsync

  const createMutation = trpcReact.storage.ceph.ec2Credentials.create.useMutation({
    onSuccess: (credential) => {
      // The secret comes back from `create` itself, so put it straight into state instead of
      // letting the effect below spend another request re-reading what we already have.
      requestedSecretIds.current.add(credential.id)
      if (isOpenRef.current) {
        setRevealedSecrets((prev) => ({ ...prev, [credential.id]: credential.secret }))
      }
      invalidateCredentialQueries(utils, { projectId: projectId ?? "", mutation: "create" })

      // Fires even though the new key is already visible in the table behind this toast: what it
      // adds is where to find the key later, which the table itself can't say. See the docblock on
      // `getCredentialCreatedToast`.
      const { message, ...options } = getCredentialCreatedToast(credential.access)
      toast.success(message, options)
    },
    onError: (err) => {
      setActionError(
        err.message === EC2_CREDENTIAL_LIMIT_REACHED
          ? t`Could not create an access key: you already hold the maximum of ${EC2_CREDENTIALS_MAX_PER_PROJECT}. Delete one first.`
          : err.message
      )
    },
  })

  const deleteMutation = trpcReact.storage.ceph.ec2Credentials.delete.useMutation({
    onSuccess: () => {
      invalidateCredentialQueries(utils, { projectId: projectId ?? "", mutation: "delete" })

      const deletedId = deletingIdRef.current
      if (deletedId) {
        const deletedCredential = credentials.find((credential) => credential.id === deletedId)
        setRevealedSecrets((prev) => {
          const next = { ...prev }
          delete next[deletedId]
          return next
        })
        if (deletedCredential) {
          const { message, ...options } = getCredentialDeletedToast(deletedCredential.access)
          toast.success(message, options)
        }
      }
      deletingIdRef.current = null
      setDeletingId(null)
    },
    onError: (err) => {
      setActionError(err.message)
      deletingIdRef.current = null
      setDeletingId(null)
    },
  })

  // Deliberately excludes the secret fetches below: those run on their own as the modal opens, and
  // blocking Close/Create/Delete on them would gate the whole modal behind a background request.
  const isBusy = createMutation.isPending || deleteMutation.isPending
  const atLimit = credentials.length >= EC2_CREDENTIALS_MAX_PER_PROJECT

  const handleClose = () => {
    trackClose()
    setRevealedSecrets({})
    setFailedSecretIds({})
    requestedSecretIds.current.clear()
    deletingIdRef.current = null
    setDeletingId(null)
    setActionError(null)
    revealMutation.reset()
    createMutation.reset()
    deleteMutation.reset()
    resetTracking()
    onClose()
  }

  const handleCreate = () => {
    if (!projectId) return
    setActionError(null)
    markSubmitted()
    createMutation.mutate({ project_id: projectId })
  }

  // `handleClose` clears the two refs below, but it is not the only way this modal can close: a
  // parent could drop `isOpen` on its own, and a mutation settling after that close would then
  // write into bookkeeping nobody is going to clear again. Resetting on the way *in* makes each
  // opening independent of how the last one ended. Declared before the fetch effect so it runs
  // first on the commit that opens the modal.
  useEffect(() => {
    if (!isOpen) return
    requestedSecretIds.current.clear()
    deletingIdRef.current = null
  }, [isOpen])

  // Fetch the secret of every key the list brings in. `list` still doesn't carry secrets - keeping
  // them out of the query cache is the entire reason `reveal` is a mutation - so this costs one
  // request per key, capped at EC2_CREDENTIALS_MAX_PER_PROJECT. A failure is recorded per key
  // rather than raised as a modal-wide error: the other key's secret is unaffected, and the row
  // itself is where the user finds out.
  useEffect(() => {
    if (!isOpen || !projectId) return

    const missing = credentials.filter((credential) => !requestedSecretIds.current.has(credential.id))
    if (missing.length === 0) return

    for (const { id } of missing) {
      requestedSecretIds.current.add(id)
      revealSecret({ project_id: projectId, credentialId: id })
        .then((credential) => {
          if (isOpenRef.current) {
            setRevealedSecrets((prev) => ({ ...prev, [credential.id]: credential.secret }))
          }
        })
        .catch(() => {
          if (isOpenRef.current) {
            setFailedSecretIds((prev) => ({ ...prev, [id]: true }))
          }
        })
    }
  }, [isOpen, projectId, credentials, revealSecret])

  // Deletes on the click, with no confirmation step, matching how a row is removed from the metadata
  // tables that live inside modals (flavors' EditSpecModal, Ceph Objects' EditMetadataModal). The
  // standing description above the table carries the warning instead.
  const handleDelete = (credentialId: string) => {
    if (!projectId) return
    setActionError(null)
    deletingIdRef.current = credentialId
    setDeletingId(credentialId)
    deleteMutation.mutate({ project_id: projectId, credentialId })
  }

  return (
    <Modal
      title={t`Manage S3 Credentials`}
      open={isOpen}
      size="xl"
      onCancel={handleClose}
      cancelButtonLabel={t`Close`}
      disableCancelButton={isBusy}
      disableCloseButton={isBusy}
      // Not covered by the two `disable*` props above: Juno wires Escape through the focus trap's
      // `escapeDeactivates`, which only consults `closeable`/`closeOnEsc` and calls `onCancel`
      // regardless of whether the buttons are disabled. Without this, Escape during a create or
      // delete runs `handleClose` ahead of the mutation's own `onSuccess`.
      closeOnEsc={!isBusy}
    >
      {actionError && (
        <Message variant="error" text={actionError} className="mb-4" onDismiss={() => setActionError(null)} />
      )}

      {/* FormSection is what section titles are built from elsewhere in the dashboard (see
          CreateFlavorModal): an <h4> matching the modal's own title, with the spacing between
          sections already handled. */}
      <FormSection title={t`Connection Details`}>
        {statusError ? (
          <Status status="error" title={t`Connection Details Unavailable`} body={statusError.message} />
        ) : (
          <DescriptionList>
            <DescriptionTerm>
              <Trans>Endpoint URL</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {s3Status ? <ClipboardText text={s3Status.endpoint} /> : <Trans>Loading…</Trans>}
            </DescriptionDefinition>
            <DescriptionTerm>
              <Trans>Region</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {s3Status ? <ClipboardText text={s3Status.region} /> : <Trans>Loading…</Trans>}
            </DescriptionDefinition>
          </DescriptionList>
        )}
      </FormSection>

      <FormSection title={t`Access Keys`}>
        <Stack direction="vertical" gap="2">
          {/* Standing description rather than banners: both facts are true of this screen at all
              times, and as dismissible-looking Messages they competed with the real ones below.
              Plain body text, like DeactivateImageModal's intro paragraph - no muted/smaller class. */}
          <p>
            <Trans>
              An access key stops working the moment it is deleted. Any S3 client still configured with it loses access.
              A project allows at most {EC2_CREDENTIALS_MAX_PER_PROJECT} access keys per user. Delete an existing key to
              create a new one.
            </Trans>
          </p>

          {/* Creating is an action on this section, not on the modal, so it sits above the table the
              way "Add Property" does in EditSpecModal - and the footer's single button is Close. */}
          <Stack direction="horizontal" className="mt-2 justify-end">
            <Button
              label={t`Create Access Key`}
              onClick={handleCreate}
              progress={createMutation.isPending}
              disabled={
                !permissions.canCreateCredential || atLimit || isBusy || isLoadingCredentials || isLoadingPermissions
              }
            />
          </Stack>

          {!isLoadingPermissions && isPermissionsError && (
            <Message variant="error" title={t`Could Not Check Permissions`}>
              <Trans>Could not verify whether you can create access keys. Reload the page or try again later.</Trans>
            </Message>
          )}

          {!isLoadingPermissions && !isPermissionsError && !permissions.canCreateCredential && (
            <Message variant="info" title={t`Insufficient Permissions`}>
              <Trans>
                You don't have permission to create S3 access keys. Contact your administrator to request access.
              </Trans>
            </Message>
          )}

          {/* The action column is sized by its buttons: an equal third would be wasted on it while
            the 40-char access key and the 56-char secret beside it run into each other. */}
          {isLoadingCredentials ? (
            <Status status="progress" title={t`Loading Access Keys...`} />
          ) : listError ? (
            <Status status="error" title={t`Could Not Load Access Keys`} body={listError.message} />
          ) : (
            <DataGrid columns={3} minContentColumns={[2]} className="mb-6">
              <DataGridRow>
                <DataGridHeadCell>
                  <Trans>Access Key ID</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell>
                  <Trans>Secret Access Key</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell></DataGridHeadCell>
              </DataGridRow>
              {credentials.length === 0 ? (
                <DataGridRow>
                  <DataGridCell colSpan={3}>
                    <Status
                      status="empty"
                      title={t`No Access Keys`}
                      body={t`Create an access key to connect an S3 client to this project.`}
                    />
                  </DataGridCell>
                </DataGridRow>
              ) : (
                credentials.map((credential) => (
                  <DataGridRow key={credential.id}>
                    <DataGridCell>
                      <ClipboardText text={credential.access} />
                    </DataGridCell>
                    <DataGridCell>
                      {revealedSecrets[credential.id] ? (
                        <ClipboardText text={revealedSecrets[credential.id]} />
                      ) : failedSecretIds[credential.id] ? (
                        <span className="text-theme-danger">
                          <Trans>Could not load secret</Trans>
                        </span>
                      ) : (
                        <Trans>Loading…</Trans>
                      )}
                    </DataGridCell>
                    <DataGridCell>
                      {deleteMutation.isPending && deletingId === credential.id ? (
                        <Spinner variant="primary" size="small" />
                      ) : (
                        permissions.canDeleteCredential && (
                          <Button
                            size="small"
                            icon="deleteForever"
                            title={t`Delete Access Key`}
                            aria-label={t`Delete Access Key`}
                            disabled={isBusy}
                            onClick={() => handleDelete(credential.id)}
                            data-testid={`delete-credential-${credential.id}`}
                          />
                        )
                      )}
                    </DataGridCell>
                  </DataGridRow>
                ))
              )}
            </DataGrid>
          )}
        </Stack>
      </FormSection>
    </Modal>
  )
}

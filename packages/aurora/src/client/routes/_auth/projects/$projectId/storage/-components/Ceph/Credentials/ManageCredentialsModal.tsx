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
  Box,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  SecretText,
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
 * Each secret sits in a `SecretText`, concealed until the user asks for it, and is fetched only
 * at that moment. The two halves go together: `SecretText` conceals with a blur overlay over a
 * textarea that still holds the value, so fetching every secret as the modal opens would put all
 * of them in the DOM behind a covering that is not a boundary. Fetching on reveal makes the
 * concealment mean what it looks like, and costs one request per key the user actually opens
 * rather than one per key that exists.
 *
 * Secrets never reach the TanStack Query cache regardless: `list` strips them server-side and
 * `reveal` is a mutation, so they live only in this component's state and go when it closes.
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
  const [loadingSecretIds, setLoadingSecretIds] = useState<Record<string, true>>({})
  // Keys created during this opening, which come up already revealed: `create` is the one moment
  // the user has to see a secret, and its value arrives in the response rather than from `reveal`.
  // Entries are never removed while the modal stays open, so creating a second key doesn't flip
  // `reveal` back to false on the first one and conceal it under the user.
  const [newlyCreatedIds, setNewlyCreatedIds] = useState<Record<string, true>>({})
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
      // The secret comes back from `create` itself, so put it straight into state rather than
      // spending a `reveal` request re-reading what we already have.
      requestedSecretIds.current.add(credential.id)
      if (isOpenRef.current) {
        setRevealedSecrets((prev) => ({ ...prev, [credential.id]: credential.secret }))
        setNewlyCreatedIds((prev) => ({ ...prev, [credential.id]: true }))
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

  // Deliberately excludes the secret fetches below: those belong to one key's reveal control, and
  // blocking Close/Create/Delete on them would gate the whole modal behind one row's request.
  const isBusy = createMutation.isPending || deleteMutation.isPending
  const atLimit = credentials.length >= EC2_CREDENTIALS_MAX_PER_PROJECT

  const handleClose = () => {
    trackClose()
    setRevealedSecrets({})
    setFailedSecretIds({})
    setLoadingSecretIds({})
    setNewlyCreatedIds({})
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
  // opening independent of how the last one ended.
  useEffect(() => {
    if (!isOpen) return
    requestedSecretIds.current.clear()
    deletingIdRef.current = null
  }, [isOpen])

  // Runs on the SecretText's own Reveal, once per key. `requestedSecretIds` makes it once and not
  // once per toggle: the value stays in state after a Hide, so re-revealing costs nothing. A
  // failure is recorded against that one key rather than raised as a modal-wide error - the other
  // key is unaffected, and the field itself is where the user finds out - and releases its id
  // again, so a second Reveal is a retry rather than a no-op against a permanently poisoned entry.
  const handleRevealSecret = (credentialId: string) => {
    if (!projectId) return
    if (requestedSecretIds.current.has(credentialId)) return

    requestedSecretIds.current.add(credentialId)
    setFailedSecretIds((prev) => {
      const next = { ...prev }
      delete next[credentialId]
      return next
    })
    setLoadingSecretIds((prev) => ({ ...prev, [credentialId]: true }))

    revealSecret({ project_id: projectId, credentialId })
      .then((credential) => {
        if (!isOpenRef.current) return
        setRevealedSecrets((prev) => ({ ...prev, [credential.id]: credential.secret }))
      })
      .catch(() => {
        requestedSecretIds.current.delete(credentialId)
        if (!isOpenRef.current) return
        setFailedSecretIds((prev) => ({ ...prev, [credentialId]: true }))
      })
      .finally(() => {
        if (!isOpenRef.current) return
        setLoadingSecretIds((prev) => {
          const next = { ...prev }
          delete next[credentialId]
          return next
        })
      })
  }

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
      // `large` (40rem), not the `xl` this modal used to need: that width existed so a
      // three-column key table could hold a 40-char access key and a 56-char secret side by side.
      // The keys are stacked cards now and the secret is a full-width SecretText, so the extra
      // 588px only stretched a textarea nothing fills.
      size="large"
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

          {/* One Box per key rather than a DataGrid: SecretText is a textarea with its own button
              row, some 120px tall, which a table row can only accommodate by growing to match and
              putting a form control inside a cell. With a ceiling of two keys the table was only
              ever buying column alignment for two one-line values, and the secret is no longer
              one of them. */}
          {isLoadingCredentials ? (
            <Status status="progress" title={t`Loading Access Keys...`} />
          ) : listError ? (
            <Status status="error" title={t`Could Not Load Access Keys`} body={listError.message} />
          ) : credentials.length === 0 ? (
            <Status
              status="empty"
              title={t`No Access Keys`}
              body={t`Create an access key to connect an S3 client to this project.`}
            />
          ) : (
            <Stack direction="vertical" gap="3" className="mb-6">
              {credentials.map((credential) => (
                <Box key={credential.id}>
                  <Stack direction="vertical" gap="3">
                    <Stack direction="horizontal" alignment="center" distribution="between" gap="2">
                      <Stack direction="vertical" gap="0">
                        <span className="text-theme-light text-xs">
                          <Trans>Access key ID</Trans>
                        </span>
                        <ClipboardText text={credential.access} />
                      </Stack>
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
                    </Stack>

                    {/* `readOnly` is what drops SecretText's Clear and Paste buttons, leaving the
                        two that mean something for a value the user can only look at. The secret
                        is empty until Reveal fetches it, so Copy stays disabled until then of its
                        own accord. */}
                    <SecretText
                      label={t`Secret access key`}
                      value={revealedSecrets[credential.id] ?? ""}
                      readOnly
                      reveal={!!newlyCreatedIds[credential.id]}
                      onReveal={() => handleRevealSecret(credential.id)}
                      copyConfirmtext={t`Secret copied to clipboard.`}
                      helptext={loadingSecretIds[credential.id] ? t`Loading the secret…` : undefined}
                      errortext={
                        failedSecretIds[credential.id]
                          ? t`Could not load the secret. Hide and reveal it again to retry.`
                          : undefined
                      }
                      invalid={!!failedSecretIds[credential.id]}
                      data-testid={`secret-${credential.id}`}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </FormSection>
    </Modal>
  )
}

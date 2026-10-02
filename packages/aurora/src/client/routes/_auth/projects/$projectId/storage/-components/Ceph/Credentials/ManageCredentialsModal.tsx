import { useEffect, useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact, trpcClient } from "@/client/trpcClient"
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
  InputGroup,
  TextInput,
  Spinner,
  toast,
} from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import ClipboardText from "@/client/components/ClipboardText"
import { DeleteCredentialModal } from "./DeleteCredentialModal"
import {
  getCredentialCreatedToast,
  getCredentialDeletedToast,
  getCredentialDeleteErrorToast,
} from "./CredentialToastNotifications"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { invalidateCredentialQueries } from "../hooks/invalidateCredentialQueries"

/**
 * Stands in for a secret that has not been fetched. Same length as a real one (base64 of the 40
 * random bytes `create` generates), so the field doesn't change shape when the value arrives, and
 * nothing anyone reading the DOM could mistake for a key.
 */
const SECRET_PLACEHOLDER = "\u2022".repeat(56)

interface ManageCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Lets the user see/create/delete their own EC2 (S3) credentials in this project, plus the
 * connection details (endpoint/region) any S3 client needs alongside them.
 *
 * A secret is fetched when its own Reveal is clicked and at no other time - creating a key is no
 * exception, and the secret `create` returns is dropped rather than shown. Hide discards the value
 * again rather than masking it; until then the field holds filler. `type="password"` only changes
 * how an input paints a value it already has, so the one thing that actually keeps a secret out of
 * reach is not having fetched it - which is also why opening this modal for the endpoint pulls no
 * secrets at all.
 *
 * It cannot be kept out of client memory altogether: Juno's `TextInput` is controlled and mirrors
 * whatever it is handed into its own state, so a displayed secret is in React state and in the DOM
 * no matter who holds it. What is ours to decide is how long, hence the discard on Hide, on delete
 * and on close - and that nothing but this component's own state ever holds it. `list` strips
 * secrets server-side, and `reveal` is called through the vanilla tRPC client rather than
 * `useMutation`, so no TanStack cache sees the answer at all.
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

  const permissionsKnown = !isLoadingPermissions && !isPermissionsError

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
  // `onClose` aborts a request that is already in flight — its `onSuccess` still runs. A late
  // completion therefore has to be able to tell that the state it was going to write into is gone.
  //
  // Which opening it belongs to, not merely whether one is open: "is the modal open now" answers
  // true again the moment it is reopened, so a reveal fired before a close would unmask its field
  // in the *next* opening, with nobody having clicked anything - and its `finally` would clear the
  // spinner of whatever reveal that opening had started in the meantime. The counter is bumped on
  // every open, and a completion carries the value it was fired under.
  const openIdRef = useRef(0)

  // Credentials deleted while a reveal of their own row was still in flight. The opening counter
  // above cannot catch this one: the modal never closed, so such a reveal still matches the opening
  // it belongs to and would write the secret of a key that is no longer there - into a row that has
  // gone, where no Hide can reach it and only closing the modal clears it. The delete's own cleanup
  // cannot catch it either: it can only drop a secret that has already arrived.
  //
  // Filled on a successful delete, not when one is started, so a delete that fails and leaves the
  // key in place still shows the secret its Reveal was fetching. An id is dropped again when that
  // row's Reveal is clicked, which is what keeps this from outliving the key's id.
  const abandonedRevealsRef = useRef<Set<string>>(new Set())

  // Only the secrets revealed right now. A key leaves this map on Hide, on delete and on close,
  // and nothing else in the component remembers it afterwards.
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [loadingSecretIds, setLoadingSecretIds] = useState<Record<string, true>>({})
  // Which row is mid-delete. The ref is what the mutation callbacks read: they can run in the same
  // tick as the click that started them, before a state update has been rendered.
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Carries the access key as well as the id, so the toasts below can name the key without looking
  // it up in a list they are invalidating in the same breath - a lookup that legitimately comes
  // back empty and used to leave the failure toast unable to say which key it was about.
  const deletingRef = useRef<{ id: string; access: string } | null>(null)
  // The key whose delete is awaiting confirmation. Holds the access key as well as the id, because
  // the dialog names the key and the row it came from may be gone by the time it is read.
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; access: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.credentials.manage",
  })

  // The one call in this component made through the vanilla client instead of a React hook, and
  // the only one that returns a secret.
  //
  // `useMutation` would put the answer in TanStack's MutationCache, which is not the query cache
  // the server-side docblock on `reveal` is about but keeps the value just as long: `reset()` only
  // detaches the observer and schedules collection after `gcTime` (five minutes by default), and
  // Hide does not call it at all. The secret would therefore outlive every action meant to discard
  // it - Hide, delete, and the close that calls `reset()` - by minutes, in a cache React Query
  // Devtools shows. The vanilla client has no cache: the answer exists as the resolved value of
  // this promise and nowhere else.
  //
  // Same client `LoginForm` sends the password through, and for the same reason.
  const revealSecret = trpcClient.storage.ceph.ec2Credentials.reveal.mutate

  const createMutation = trpcReact.storage.ceph.ec2Credentials.create.useMutation({
    onSuccess: (credential) => {
      // The secret `create` answers with is deliberately dropped: a new key appears concealed,
      // like every other row, and is read through its own Reveal. Showing it here would be the
      // one place a secret lands on screen without being asked for - and it is no longer the
      // only chance to see it, which is what used to justify that.
      invalidateCredentialQueries(utils, { projectId: projectId ?? "", mutation: "create" })

      // Fires even though the new key is already visible in the table behind this toast: what it
      // adds is where to find the key later, which the table itself can't say. See the docblock on
      // `getCredentialCreatedToast`.
      const { message, ...options } = getCredentialCreatedToast(credential.access)
      toast.success(message, options)
    },
    onError: (err) => {
      setActionError(err.message)
    },
  })

  const deleteMutation = trpcReact.storage.ceph.ec2Credentials.delete.useMutation({
    onSuccess: () => {
      invalidateCredentialQueries(utils, { projectId: projectId ?? "", mutation: "delete" })

      const deleted = deletingRef.current
      if (deleted) {
        setRevealedSecrets((prev) => {
          const next = { ...prev }
          delete next[deleted.id]
          return next
        })
        // The line above only reaches a secret that is already here. One still in flight would
        // land afterwards and put itself back, into a row that no longer exists - see the ref.
        abandonedRevealsRef.current.add(deleted.id)
        const { message, ...options } = getCredentialDeletedToast(deleted.access)
        toast.success(message, options)
      }
      deletingRef.current = null
      setDeletingId(null)
    },
    onError: (err) => {
      const failed = deletingRef.current

      // A toast, not the modal's error Message: a delete reports its outcome in one place
      // whichever way it goes, and the successful one above is already a toast.
      const { message, ...options } = getCredentialDeleteErrorToast(failed?.access ?? "", err.message)
      toast.error(message, options)

      // Refreshed even though nothing was deleted. The commonest failure is NOT_FOUND - the key
      // was already gone - and leaving its row on screen would be a worse lie than the silent
      // success this replaces. A failure that leaves the key in place costs one list refetch.
      invalidateCredentialQueries(utils, { projectId: projectId ?? "", mutation: "delete" })

      deletingRef.current = null
      setDeletingId(null)
    },
  })

  // Deliberately excludes the secret fetches below: those belong to one row's Reveal, and blocking
  // Close/Create/Delete on them would gate the whole modal behind one row's request.
  const isBusy = createMutation.isPending || deleteMutation.isPending

  const handleClose = () => {
    trackClose()
    setRevealedSecrets({})
    setLoadingSecretIds({})
    abandonedRevealsRef.current.clear()
    deletingRef.current = null
    setDeletingId(null)
    setDeleteTarget(null)
    setActionError(null)
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

  // `handleClose` clears all of this, but it is not the only way out: Escape reaches Juno's Modal
  // through the focus trap's `escapeDeactivates`, and a parent can drop `isOpen` on its own. The
  // modal stays mounted either way, so without this a secret revealed before such a close would
  // still be in state - and still on screen when it reopens.
  useEffect(() => {
    // Bumped in both directions: a close invalidates what the opening had in flight, and the next
    // open invalidates it again rather than adopting it.
    openIdRef.current += 1
    if (isOpen) return
    setRevealedSecrets({})
    setLoadingSecretIds({})
    setDeleteTarget(null)
    deletingRef.current = null
    abandonedRevealsRef.current.clear()
  }, [isOpen])

  // The only place a secret is fetched. Guarded on the two states that mean "already have it or
  // already asking", so a double click costs one request. A failure goes to the modal's single
  // error Message, naming the key it belongs to, rather than to that field's own `errortext`:
  // one error surface per modal, not one per row. Nothing is recorded against the key, so the
  // next Reveal is simply a retry.
  const handleRevealSecret = (credentialId: string, access: string) => {
    if (!projectId) return
    if (loadingSecretIds[credentialId] || revealedSecrets[credentialId]) return

    setActionError(null)
    setLoadingSecretIds((prev) => ({ ...prev, [credentialId]: true }))
    // This request is the row's current one again, whatever happened to the previous one.
    abandonedRevealsRef.current.delete(credentialId)

    // The opening this request belongs to. Anything that comes back under a different one is
    // dropped: by then its field has been cleared and may be looking at a different request.
    const openId = openIdRef.current

    // Still wanted when it lands: same opening, and the row has not been deleted in the meantime.
    const stillWanted = () => openIdRef.current === openId && !abandonedRevealsRef.current.has(credentialId)

    revealSecret({ project_id: projectId, credentialId })
      .then((credential) => {
        if (!stillWanted()) return
        setRevealedSecrets((prev) => ({ ...prev, [credential.id]: credential.secret }))
      })
      .catch(() => {
        if (!stillWanted()) return
        setActionError(t`Could not load the secret for access key "${access}". Try again.`)
      })
      .finally(() => {
        // Only the opening is checked here: a delete that failed leaves the row on screen, and its
        // Reveal has to stop spinning whether or not the secret it fetched was still wanted.
        if (openIdRef.current !== openId) return
        setLoadingSecretIds((prev) => {
          const next = { ...prev }
          delete next[credentialId]
          return next
        })
      })
  }

  // Throws the value away rather than flipping the input back to `type="password"` over a live
  // one. That a second Reveal then costs a second request is the trade being made, not an
  // oversight: between the two there is no secret in this component to leak.
  const handleHideSecret = (credentialId: string) => {
    setRevealedSecrets((prev) => {
      const next = { ...prev }
      delete next[credentialId]
      return next
    })
  }

  // Reached from the confirmation dialog, never straight from the row's button: deleting a key is
  // not like removing a row from the metadata tables this table otherwise resembles - it revokes
  // access for every S3 client configured with that key, with no undo.
  const handleDelete = (target: { id: string; access: string }) => {
    if (!projectId) return
    setActionError(null)
    deletingRef.current = target
    setDeletingId(target.id)
    deleteMutation.mutate({ project_id: projectId, credentialId: target.id })
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
      closeOnEsc={!isBusy}
    >
      {actionError && (
        <Message variant="error" text={actionError} className="mb-4" role="alert" aria-live="assertive" />
      )}
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
          {/* Standing description rather than a banner: it is true of this screen at all times, and
              as a dismissible-looking Message it competed with the real ones below. Plain body text,
              like DeactivateImageModal's intro paragraph - no muted/smaller class. */}
          <p>
            <Trans>
              An access key stops working the moment it is deleted. Any S3 client still configured with it loses access.
            </Trans>
          </p>

          {/* Creating is an action on this section, not on the modal, so it sits above the table the
              way "Add Property" does in EditSpecModal - and the footer's single button is Close.

              Rendered only for a user who may create, the way the row's delete button is rendered
              only for a user who may delete: an action nobody can take is not shown at all. While
              the check is still running, or if it failed, the button stays put and disabled - what
              is unknown is reported as unknown rather than as a refusal (see the two messages
              below), and hiding a control that may be about to come back only makes the section
              jump. */}
          {(!permissionsKnown || permissions.canCreateCredential) && (
            <Stack direction="horizontal" className="mt-2 justify-end">
              <Button
                label={t`Create Access Key`}
                onClick={handleCreate}
                progress={createMutation.isPending}
                disabled={!permissions.canCreateCredential || isBusy || isLoadingCredentials || isLoadingPermissions}
              />
            </Stack>
          )}

          {!isLoadingPermissions && isPermissionsError && (
            <Message variant="error" title={t`Could Not Check Permissions`} role="alert" aria-live="assertive">
              <Trans>Could not verify whether you can create access keys. Reload the page or try again later.</Trans>
            </Message>
          )}

          {/* Whichever of the two is missing, the user is told what they cannot do here and sent to
              the person who can grant it - a hidden button on its own would read as a screen that
              simply has no such feature. The list itself stays visible: reading one's own keys is
              not permission-gated anywhere in this UI (see useCephPermissions), and the endpoint and
              region beside them are what someone without either permission came for. */}
          {permissionsKnown && !permissions.canCreateCredential && !permissions.canDeleteCredential && (
            <Message variant="info" title={t`Insufficient Permissions`}>
              <Trans>
                You don't have permission to create or delete S3 access keys. Contact your administrator to request
                access.
              </Trans>
            </Message>
          )}

          {permissionsKnown && !permissions.canCreateCredential && permissions.canDeleteCredential && (
            <Message variant="info" title={t`Insufficient Permissions`}>
              <Trans>
                You don't have permission to create S3 access keys. Contact your administrator to request access.
              </Trans>
            </Message>
          )}

          {permissionsKnown && permissions.canCreateCredential && !permissions.canDeleteCredential && (
            <Message variant="info" title={t`Insufficient Permissions`}>
              <Trans>
                You don't have permission to delete S3 access keys. Contact your administrator to request access.
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
            // An explicit template instead of `minContentColumns`: with equal `auto` tracks the
            // secret column came out narrower than the access one, although it holds 56 characters
            // against 40 plus a button. The `min-content` floor is what stops a track being sized
            // below the `min-w-[…ch]` its field asks for - under `minmax(0, …)` the field is
            // squeezed and the value clipped again, which is the bug this is fixing.
            <DataGrid
              columns={3}
              gridColumnTemplate="minmax(min-content, 2fr) minmax(min-content, 3fr) min-content"
              className="mb-6"
            >
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
                credentials.map((credential) => {
                  const access = credential.access

                  return (
                    <DataGridRow key={credential.id}>
                      <DataGridCell>
                        <TextInput
                          readOnly
                          value={credential.access}
                          aria-label={t`Access key ID`}
                          className="min-w-[calc(41ch+2rem)] font-mono text-sm"
                          data-testid={`access-${credential.id}`}
                        />
                      </DataGridCell>
                      <DataGridCell>
                        <InputGroup className="w-full">
                          <TextInput
                            readOnly
                            type={revealedSecrets[credential.id] ? "text" : "password"}
                            value={revealedSecrets[credential.id] ?? SECRET_PLACEHOLDER}
                            aria-label={t`Secret access key`}
                            className="min-w-[calc(57ch+2rem)] font-mono text-sm"
                            data-testid={`secret-${credential.id}`}
                          />
                          <Button
                            label={revealedSecrets[credential.id] ? t`Hide` : t`Reveal`}
                            progress={!!loadingSecretIds[credential.id]}
                            disabled={!!loadingSecretIds[credential.id] || isBusy}
                            onClick={() =>
                              revealedSecrets[credential.id]
                                ? handleHideSecret(credential.id)
                                : handleRevealSecret(credential.id, credential.access)
                            }
                            data-testid={`toggle-secret-${credential.id}`}
                          />
                        </InputGroup>
                      </DataGridCell>
                      <DataGridCell>
                        {deleteMutation.isPending && deletingId === credential.id ? (
                          <Spinner variant="primary" size="small" />
                        ) : (
                          (!permissionsKnown || permissions.canDeleteCredential) && (
                            <Button
                              size="small"
                              icon="deleteForever"
                              title={t`Delete access key ${access}`}
                              aria-label={t`Delete access key ${access}`}
                              disabled={!permissions.canDeleteCredential || isBusy}
                              onClick={() => setDeleteTarget({ id: credential.id, access: credential.access })}
                              data-testid={`delete-credential-${credential.id}`}
                            />
                          )
                        )}
                      </DataGridCell>
                    </DataGridRow>
                  )
                })
              )}
            </DataGrid>
          )}
        </Stack>
      </FormSection>

      <DeleteCredentialModal
        isOpen={deleteTarget !== null}
        accessKey={deleteTarget?.access ?? ""}
        isLastKey={credentials.length === 1}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) handleDelete(target)
        }}
      />
    </Modal>
  )
}

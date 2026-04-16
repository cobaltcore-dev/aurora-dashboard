import { useEffect, useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { ObjectRow } from "./"

export type DeleteObjectVariant = "delete"

interface DeleteObjectModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const DeleteObjectModal = ({ isOpen, object, onClose, onSuccess, onError }: DeleteObjectModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  // keepSegments is only relevant for SLOs — toggled by a checkbox in the modal.
  const [keepSegments, setKeepSegments] = useState(false)

  // useRef so the object display name survives re-renders triggered by
  // deleteObjectMutation.reset() inside handleClose() before onSuccess/onError fire.
  const displayNameRef = useRef("")

  // ── Metadata fetch ────────────────────────────────────────────────────────
  // Fetch object metadata on open to detect SLO/DLO — determines whether
  // multipartManifest="delete" should be sent in the DELETE request.
  //
  // SLO: X-Static-Large-Object: True  → staticLargeObject === true
  // DLO: X-Object-Manifest: <prefix>  → objectManifest is set
  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = trpcReact.storage.swift.getObjectMetadata.useQuery(
    { container: containerName, object: object?.name ?? "" },
    { enabled: isOpen && object !== null }
  )

  const isSLO = metadata?.staticLargeObject === true
  const isDLO = !!metadata?.objectManifest

  const deleteObjectMutation = trpcReact.storage.swift.deleteObject.useMutation({
    onSuccess: () => {
      utils.storage.swift.listObjects.invalidate({ container: containerName })
      onSuccess?.(displayNameRef.current)
    },
    onError: (error) => {
      onError?.(displayNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      deleteObjectMutation.reset()
      setKeepSegments(false)
    }
  }, [isOpen])

  const handleClose = () => {
    deleteObjectMutation.reset()
    onClose()
  }

  const handleConfirm = () => {
    if (!object) return
    displayNameRef.current = object.displayName
    deleteObjectMutation.mutate({
      container: containerName,
      object: object.name,
      // Send multipartManifest="delete" for SLOs only when the user has NOT
      // checked "Keep segments" — tells Swift to also delete all segment objects.
      // DLOs always use plain DELETE (segments are prefix-based, not enumerable).
      ...(isSLO && !keepSegments ? { multipartManifest: "delete" as const } : {}),
    })
  }

  if (!isOpen || !object) return null

  const displayName = object.displayName
  const isLoading = isLoadingMetadata
  const isPending = deleteObjectMutation.isPending
  const metadataErrorMessage = metadataError?.message ?? ""

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Delete object:</Trans>
          </span>
          <span className="truncate font-mono" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Deleting...` : t`Delete`}
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isLoading || isPending}
    >
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Deleting...</Trans>
        </Stack>
      ) : isLoading ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading object info...</Trans>
        </Stack>
      ) : metadataError ? (
        <Message variant="danger">
          <Trans>Failed to load object metadata: {metadataErrorMessage}</Trans>
        </Message>
      ) : (
        <Stack direction="vertical" gap="4">
          <Message variant="warning">
            <Trans>
              <strong>Are you sure?</strong> Object <span className="font-mono font-semibold">"{displayName}"</span>{" "}
              will be permanently deleted. This cannot be undone.
            </Trans>
          </Message>
          {isSLO && (
            <>
              <Message variant="info">
                <Trans>
                  This is a <strong>static large object</strong>. By default, all associated segment objects will also
                  be permanently deleted.
                </Trans>
              </Message>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={keepSegments}
                  onChange={(e) => setKeepSegments(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  <Trans>Keep segments (delete manifest only)</Trans>
                </span>
              </label>
            </>
          )}
          {isDLO && (
            <Message variant="info">
              <Trans>
                This is a <strong>dynamic large object</strong>. Only the manifest will be deleted — its segment objects
                (stored under the manifest prefix) are <strong>not</strong> automatically removed and must be deleted
                separately.
              </Trans>
            </Message>
          )}
        </Stack>
      )}
    </Modal>
  )
}

import { useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { ObjectRow } from "./"

/**
 * "delete"        — deletes the object. For SLOs also deletes all segment
 *                   objects via multipartManifest="delete". For DLOs and
 *                   regular objects, plain DELETE (no query param).
 * "keep-segments" — deletes only the SLO manifest; segment objects are
 *                   retained. Always a plain DELETE (no multipartManifest).
 */
export type DeleteObjectVariant = "delete" | "keep-segments"

interface DeleteObjectModalProps {
  isOpen: boolean
  object: ObjectRow | null
  variant: DeleteObjectVariant
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const DeleteObjectModal = ({ isOpen, object, variant, onClose, onSuccess, onError }: DeleteObjectModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  // useRef so the object display name survives re-renders triggered by
  // deleteObjectMutation.reset() inside handleClose() before onSuccess/onError fire.
  const submittedNameRef = useRef("")

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
      onSuccess?.(submittedNameRef.current)
    },
    onError: (error) => {
      onError?.(submittedNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      deleteObjectMutation.reset()
    }
  }, [isOpen])

  const handleClose = () => {
    deleteObjectMutation.reset()
    onClose()
  }

  const handleConfirm = () => {
    if (!object) return
    submittedNameRef.current = object.displayName
    deleteObjectMutation.mutate({
      container: containerName,
      object: object.name,
      // Only send multipartManifest="delete" for confirmed SLO manifests in
      // the "delete" variant — this tells Swift to also delete all segment
      // objects. DLOs use a plain DELETE (their segments live under a prefix
      // and must be removed separately). "keep-segments" always uses plain
      // DELETE regardless of object type.
      ...(variant === "delete" && isSLO ? { multipartManifest: "delete" as const } : {}),
    })
  }

  if (!isOpen || !object) return null

  const isKeepSegments = variant === "keep-segments"
  const displayName = object.displayName
  const isLoading = isLoadingMetadata
  const isPending = deleteObjectMutation.isPending
  const metadataErrorMessage = metadataError?.message ?? ""

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            {isKeepSegments ? <Trans>Delete manifest:</Trans> : <Trans>Delete object:</Trans>}
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
      ) : isKeepSegments ? (
        <Stack direction="vertical" gap="4">
          <Message variant="warning">
            <Trans>
              <strong>Are you sure?</strong> The manifest for{" "}
              <span className="font-mono font-semibold">"{displayName}"</span> will be permanently deleted. This cannot
              be undone.
            </Trans>
          </Message>
          <Message variant="info">
            <Trans>
              Only the <strong>manifest</strong> will be deleted — the segment objects that make up this large object
              will be <strong>retained</strong> in the container. Use this option when segments are shared across
              multiple manifests. If you also want to remove the segments, use <strong>Delete</strong> instead.
            </Trans>
          </Message>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          <Message variant="warning">
            <Trans>
              <strong>Are you sure?</strong> Object <span className="font-mono font-semibold">"{displayName}"</span>{" "}
              will be permanently deleted. This cannot be undone.
            </Trans>
          </Message>
          {isSLO && (
            <Message variant="info">
              <Trans>
                This is a <strong>static large object</strong> — all associated segment objects will also be permanently
                deleted. If you want to keep the segments, use <strong>Delete (Keep Segments)</strong> instead.
              </Trans>
            </Message>
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

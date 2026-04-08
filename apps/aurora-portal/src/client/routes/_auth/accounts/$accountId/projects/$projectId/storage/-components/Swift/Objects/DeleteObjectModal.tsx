import { useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { ObjectRow } from "./"

/**
 * "delete"        — deletes the object and all its segments (SLO/DLO manifests).
 * "keep-segments" — deletes only the manifest; segment objects are retained.
 *                   Only shown for large objects (SLO/DLO).
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
      // multipartManifest="delete" tells Swift to also delete all segment objects.
      // Omitting it deletes only the manifest — i.e. keep-segments behaviour.
      ...(variant === "delete" ? { multipartManifest: "delete" as const } : {}),
    })
  }

  if (!isOpen || !object) return null

  const isKeepSegments = variant === "keep-segments"
  const displayName = object.displayName

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
      confirmButtonLabel={deleteObjectMutation.isPending ? t`Deleting...` : t`Delete`}
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={deleteObjectMutation.isPending}
    >
      {deleteObjectMutation.isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Deleting...</Trans>
        </Stack>
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
          <Message variant="info">
            <Trans>
              Note: for <strong>static and dynamic large objects</strong>, this also deletes all associated segment
              objects. If you want to keep the segments, use <strong>Delete (Keep Segments)</strong> instead.
            </Trans>
          </Message>
        </Stack>
      )}
    </Modal>
  )
}

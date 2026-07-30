import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, TextInput } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface DeleteVersionModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  versionId: string
  versionDate?: string
  versionSize?: number
  isDeleteMarker?: boolean
  folderMarkerVersionId?: string
  allVersionIds?: string[]
  onClose: () => void
  onSuccess?: (objectKey: string, versionId: string) => void
  onError?: (objectKey: string, errorMessage: string) => void
}

export const DeleteVersionModal = ({
  isOpen,
  bucketName,
  objectKey,
  versionId,
  versionDate,
  versionSize,
  isDeleteMarker = false,
  folderMarkerVersionId,
  allVersionIds,
  onClose,
  onSuccess,
  onError,
}: DeleteVersionModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmText, setConfirmText] = useState("")
  const isFolder = objectKey.endsWith("/")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.object.version.delete",
  })

  const utils = trpcReact.useUtils()

  // Use bulk delete endpoint for all cases (single or multiple versions)
  // This simplifies logic and handles atomic folder deletion
  const deleteMutation = trpcReact.storage.ceph.objects.deleteVersionsBulk.useMutation({
    onSuccess: () => {
      utils.storage.ceph.versioning.listObjectVersions.invalidate()
      utils.storage.ceph.versioning.checkDeletedContent.invalidate()
      utils.storage.ceph.objects.list.invalidate()
      utils.storage.ceph.containers.list.invalidate()
      onSuccess?.(objectKey, versionId)
      handleClose()
    },
    onError: (error) => {
      onError?.(objectKey, error.message)
    },
  })

  const handleClose = () => {
    setConfirmText("")
    resetTracking()
    deleteMutation.reset()
    onClose()
  }

  // Show "all versions" UI if array has multiple versions
  // Must be computed before handleDelete to ensure consistent behavior
  const isDeletingAllVersions = allVersionIds && allVersionIds.length > 0

  const handleDelete = () => {
    if (confirmText !== "delete") return

    markSubmitted()

    // Build versions array:
    // - For deleted folders: include both delete marker and folder marker
    // - For deleted files (with delete marker): include ALL versions (complete deletion)
    // - For regular versions: include only the version itself
    const versions =
      isFolder && isDeleteMarker && folderMarkerVersionId
        ? [
            { key: objectKey, versionId }, // Delete marker of the folder
            { key: objectKey, versionId: folderMarkerVersionId }, // Folder marker itself
          ]
        : isDeletingAllVersions
          ? allVersionIds.map((vid) => ({ key: objectKey, versionId: vid })) // Delete ALL versions
          : [{ key: objectKey, versionId }] // Single version

    deleteMutation.mutate({
      project_id: projectId,
      containerName: bucketName,
      versions,
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title={isDeletingAllVersions ? t`Delete All Versions` : t`Delete Version`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Delete`}
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={confirmText !== "delete" || deleteMutation.isPending}
      confirmButtonVariant="primary-danger"
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
          {isDeletingAllVersions ? (
            <Trans>This object and all its versions will be permanently deleted and cannot be restored.</Trans>
          ) : (
            <Trans>This version will be permanently deleted and cannot be restored.</Trans>
          )}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold">
              <Trans>Object:</Trans>
            </label>
            <p className="mt-1 overflow-x-hidden text-sm [overflow-wrap:anywhere]">{objectKey}</p>
          </div>

          {isDeletingAllVersions ? (
            <div>
              <label className="text-sm font-semibold">
                <Trans>Versions to delete:</Trans>
              </label>
              <div className="bg-theme-background-lvl-2 mt-2 max-h-48 overflow-y-auto rounded p-3">
                <Stack direction="vertical" gap="1">
                  {allVersionIds!.map((vid, idx) => (
                    <code key={idx} className="block overflow-x-hidden text-xs [overflow-wrap:anywhere]">
                      {vid}
                    </code>
                  ))}
                </Stack>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-semibold">
                <Trans>Version ID:</Trans>
              </label>
              <p className="mt-1 overflow-x-hidden [overflow-wrap:anywhere]">
                <code className="text-sm">{versionId}</code>
              </p>
            </div>
          )}

          {!isDeleteMarker && versionDate && (
            <div>
              <label className="text-sm font-semibold">
                <Trans>Date:</Trans>
              </label>
              <p className="mt-1 text-sm">{new Date(versionDate).toLocaleString()}</p>
            </div>
          )}

          {!isDeleteMarker && versionSize !== undefined && (
            <div>
              <label className="text-sm font-semibold">
                <Trans>Size:</Trans>
              </label>
              <p className="mt-1 text-sm">{formatBytesBinary(versionSize)}</p>
            </div>
          )}
        </div>

        <div>
          <TextInput
            label={t`Type "delete" to confirm`}
            value={confirmText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoFocus
            disabled={deleteMutation.isPending}
          />
        </div>

        {deleteMutation.error && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {deleteMutation.error.message}
          </p>
        )}
      </Stack>
    </Modal>
  )
}

import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import type { DeleteObjectsBulkOutput } from "@/server/Storage/types/ceph"
import { formatBulkDeleteErrors } from "./utils/bulkDeleteErrors"

interface RestoreVersionModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  versionId: string
  versionDate?: string
  versionSize?: number
  onClose: () => void
  onSuccess?: (objectKey: string, versionId: string) => void
  onError?: (objectKey: string, errorMessage: string) => void
}

export const RestoreVersionModal = ({
  isOpen,
  bucketName,
  objectKey,
  versionId,
  versionDate,
  versionSize,
  onClose,
  onSuccess,
  onError,
}: RestoreVersionModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [failureMessage, setFailureMessage] = useState<string | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.object.version.restore",
  })

  const utils = trpcReact.useUtils()

  // For folders (keys ending with "/"), we delete the delete marker instead of copying
  const isFolder = objectKey.endsWith("/")

  const invalidateAfterRestore = () => {
    utils.storage.ceph.versioning.listObjectVersions.invalidate()
    utils.storage.ceph.versioning.checkDeletedContent.invalidate()
    utils.storage.ceph.objects.list.invalidate()
    utils.storage.ceph.containers.list.invalidate()
  }

  // versioning.restoreVersion either succeeds or rejects — no per-item results.
  const handleRestoreSuccess = () => {
    invalidateAfterRestore()
    onSuccess?.(objectKey, versionId)
    handleClose()
  }

  // deleteVersionsBulk resolves even when S3 refused the delete marker: a per-item
  // failure comes back in `errors`, not as a thrown error. Treat it as a failure.
  const handleDeleteMarkerSuccess = (result: DeleteObjectsBulkOutput) => {
    invalidateAfterRestore()
    if (result.errorCount > 0) {
      setFailureMessage(formatBulkDeleteErrors(result.errors))
      return
    }
    onSuccess?.(objectKey, versionId)
    handleClose()
  }

  const restoreMutation = trpcReact.storage.ceph.versioning.restoreVersion.useMutation({
    onSuccess: handleRestoreSuccess,
    onError: (error) => {
      onError?.(objectKey, error.message)
      handleClose()
    },
    onSettled: () => {
      restoreMutation.reset()
    },
  })

  const deleteVersionMutation = trpcReact.storage.ceph.objects.deleteVersionsBulk.useMutation({
    onSuccess: handleDeleteMarkerSuccess,
    onError: (error) => {
      onError?.(objectKey, error.message)
      handleClose()
    },
    onSettled: () => {
      deleteVersionMutation.reset()
    },
  })

  const handleClose = () => {
    setFailureMessage(null)
    resetTracking()
    onClose()
  }

  const handleRestore = () => {
    setFailureMessage(null)
    markSubmitted()
    if (isFolder) {
      // For folders, delete the delete marker instead of copying
      deleteVersionMutation.mutate({
        project_id: projectId,
        containerName: bucketName,
        versions: [{ key: objectKey, versionId }],
      })
    } else {
      // For files, copy the old version to make it current
      restoreMutation.mutate({
        project_id: projectId,
        bucket: bucketName,
        key: objectKey,
        versionId,
      })
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      title={isFolder ? t`Restore Folder` : t`Restore Version`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={isFolder ? t`Restore Folder` : t`Restore Version`}
      onConfirm={handleRestore}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={restoreMutation.isPending || deleteVersionMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {isFolder ? (
          <>
            <div>
              <label className="text-sm font-semibold">
                <Trans>Folder name:</Trans>
              </label>{" "}
              <span className="text-sm">{objectKey}</span>
            </div>
            <p className="text-sm">
              <Trans>
                Only the folder itself will be restored. Objects inside this folder will remain deleted and must be
                restored individually.
              </Trans>
            </p>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold">
                  <Trans>Object:</Trans>
                </label>
                <p className="mt-1 text-sm">{objectKey}</p>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  <Trans>Version ID:</Trans>
                </label>
                <p className="mt-1">
                  <code className="text-sm">{versionId}</code>
                </p>
              </div>

              {versionDate && (
                <div>
                  <label className="text-sm font-semibold">
                    <Trans>Date:</Trans>
                  </label>
                  <p className="mt-1 text-sm">{new Date(versionDate).toLocaleString()}</p>
                </div>
              )}

              {versionSize !== undefined && (
                <div>
                  <label className="text-sm font-semibold">
                    <Trans>Size:</Trans>
                  </label>
                  <p className="mt-1 text-sm">{formatBytesBinary(versionSize)}</p>
                </div>
              )}
            </div>

            <p className="text-sm">
              <Trans>After restoring, this version's content will become the new latest version.</Trans>
            </p>
          </>
        )}
        {failureMessage && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {failureMessage}
          </p>
        )}
      </Stack>
    </Modal>
  )
}

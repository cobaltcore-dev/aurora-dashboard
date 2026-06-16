import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"

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

  const utils = trpcReact.useUtils()

  const restoreMutation = trpcReact.storage.ceph.versioning.restoreVersion.useMutation({
    onSuccess: () => {
      utils.storage.ceph.versioning.listObjectVersions.invalidate()
      utils.storage.ceph.objects.list.invalidate()
      onSuccess?.(objectKey, versionId)
      onClose()
    },
    onError: (error) => {
      onError?.(objectKey, error.message)
      onClose()
    },
    onSettled: () => {
      restoreMutation.reset()
    },
  })

  const handleRestore = () => {
    restoreMutation.mutate({
      project_id: projectId,
      bucket: bucketName,
      key: objectKey,
      versionId,
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Restore Version`}
      open={isOpen}
      onCancel={onClose}
      confirmButtonLabel={t`Restore Version`}
      onConfirm={handleRestore}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={restoreMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <Message variant="info" title={t`How Restore Works`}>
          <Trans>
            This creates a new latest version with the content from the selected version. All existing versions
            (including the current latest) are preserved.
          </Trans>
        </Message>

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

        <Message variant="warning">
          <Trans>After restoring, this version's content will become the new latest version.</Trans>
        </Message>
      </Stack>
    </Modal>
  )
}

import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, TextInput } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface DeleteVersionModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  versionId: string
  versionDate?: string
  versionSize?: number
  isDeleteMarker?: boolean
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
  onClose,
  onSuccess,
  onError,
}: DeleteVersionModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmText, setConfirmText] = useState("")

  const utils = trpcReact.useUtils()

  const deleteMutation = trpcReact.storage.ceph.versioning.deleteVersion.useMutation({
    onSuccess: () => {
      utils.storage.ceph.versioning.listObjectVersions.invalidate()
      utils.storage.ceph.objects.list.invalidate()
      onSuccess?.(objectKey, versionId)
      handleClose()
    },
    onError: (error) => {
      onError?.(objectKey, error.message)
      handleClose()
    },
    onSettled: () => {
      deleteMutation.reset()
    },
  })

  const handleClose = () => {
    setConfirmText("")
    onClose()
  }

  const handleDelete = () => {
    if (confirmText !== "DELETE") return

    deleteMutation.mutate({
      project_id: projectId,
      bucket: bucketName,
      key: objectKey,
      versionId,
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Delete Version Permanently`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Delete Permanently`}
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={confirmText !== "DELETE" || deleteMutation.isPending}
      confirmButtonVariant="primary-danger"
    >
      <Stack direction="vertical" gap="4">
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
          <label className="text-sm font-semibold">
            <Trans>
              Type <code>DELETE</code> to confirm:
            </Trans>
          </label>
          <TextInput
            value={confirmText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="mt-2"
            disabled={deleteMutation.isPending}
          />
        </div>
      </Stack>
    </Modal>
  )
}

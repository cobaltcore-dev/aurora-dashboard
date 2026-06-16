import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Button, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface DeleteObjectModalProps {
  bucketName: string
  objectKey: string
  objectSize?: number
  lastModified?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (objectKey: string) => void
  onError: (objectKey: string, errorMessage: string) => void
}

export function DeleteObjectModal({
  bucketName,
  objectKey,
  objectSize,
  lastModified,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: DeleteObjectModalProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmText, setConfirmText] = useState("")
  const utils = trpcReact.useUtils()

  const deleteMutation = trpcReact.storage.ceph.objects.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.list.invalidate()
      onSuccess(objectKey)
      handleClose()
    },
    onError: (error) => {
      onError(objectKey, error.message)
    },
  })

  const handleClose = () => {
    setConfirmText("")
    deleteMutation.reset()
    onClose()
  }

  const handleConfirm = () => {
    if (!projectId) return

    deleteMutation.mutate({
      project_id: projectId,
      containerName: bucketName,
      objectKey,
    })
  }

  const isFolder = objectKey.endsWith("/")
  const displayName = objectKey.split("/").filter(Boolean).pop() || objectKey
  const isConfirmValid = confirmText === "DELETE"

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={isFolder ? <Trans>Delete Folder</Trans> : <Trans>Delete Object</Trans>}
      size="large"
    >
      <Stack direction="vertical" gap="4">
        <p>
          {isFolder ? (
            <Trans>Are you sure you want to delete this folder?</Trans>
          ) : (
            <Trans>Are you sure you want to delete this object?</Trans>
          )}
        </p>

        <div className="bg-theme-background-lvl-2 rounded p-4">
          <Stack direction="vertical" gap="2">
            <div>
              <span className="text-juno-grey-light-1 text-sm">
                <Trans>Name:</Trans>
              </span>
              <div className="mt-1 text-sm">{displayName}</div>
            </div>

            {!isFolder && objectSize !== undefined && (
              <div>
                <span className="text-juno-grey-light-1 text-sm">
                  <Trans>Size:</Trans>
                </span>
                <div className="mt-1 text-sm">{formatBytesBinary(objectSize)}</div>
              </div>
            )}

            {!isFolder && lastModified && (
              <div>
                <span className="text-juno-grey-light-1 text-sm">
                  <Trans>Last Modified:</Trans>
                </span>
                <div className="mt-1 text-sm">{new Date(lastModified).toLocaleString()}</div>
              </div>
            )}

            <div>
              <span className="text-juno-grey-light-1 text-sm">
                <Trans>Full Path:</Trans>
              </span>
              <div className="mt-1 text-sm break-all">{objectKey}</div>
            </div>
          </Stack>
        </div>

        <div>
          <p className="text-juno-red mb-2 text-sm">
            <Trans>This action cannot be undone.</Trans>
          </p>
          <TextInput
            label={t`Type DELETE to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
          />
        </div>

        {deleteMutation.error && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {deleteMutation.error.message}
          </p>
        )}
      </Stack>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="subdued" onClick={handleClose} disabled={deleteMutation.isPending}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary-danger" onClick={handleConfirm} disabled={!isConfirmValid || deleteMutation.isPending}>
          {deleteMutation.isPending ? <Trans>Deleting...</Trans> : <Trans>Delete</Trans>}
        </Button>
      </div>
    </Modal>
  )
}

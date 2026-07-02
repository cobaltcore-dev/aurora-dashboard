import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface DeleteObjectModalProps {
  bucketName: string
  objectKey: string
  objectSize?: number
  lastModified?: string
  isOpen: boolean
  versioningEnabled?: boolean
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
  versioningEnabled = false,
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
      utils.storage.ceph.containers.list.invalidate()
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
      title={isFolder ? <Trans>Delete Folder "{displayName}"</Trans> : <Trans>Delete Object</Trans>}
      size="large"
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmValid || deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
      disableCloseButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
          {isFolder ? (
            versioningEnabled ? (
              <Trans>
                Confirm deletion of {displayName}. All objects inside this folder will be marked as deleted but can be
                restored from version history.
              </Trans>
            ) : (
              <Trans>
                Confirm deletion of {displayName}. All objects inside this folder will be permanently deleted.
              </Trans>
            )
          ) : versioningEnabled ? (
            <Trans>
              Confirm deletion of {displayName}. The object will be marked as deleted but can be restored from version
              history.
            </Trans>
          ) : (
            <Trans>Confirm deletion of {displayName}. This action cannot be undone.</Trans>
          )}
        </p>

        <div className="bg-theme-background-lvl-2 rounded p-4">
          <Stack direction="vertical" gap="2">
            <div>
              <span className="text-theme-light text-sm">
                <Trans>Name:</Trans>
              </span>
              <div className="mt-1 overflow-x-hidden [overflow-wrap:anywhere]">{displayName}</div>
            </div>

            {!isFolder && objectSize !== undefined && (
              <div>
                <span className="text-theme-light text-sm">
                  <Trans>Size:</Trans>
                </span>
                <div className="mt-1">{formatBytesBinary(objectSize)}</div>
              </div>
            )}

            {!isFolder && lastModified && (
              <div>
                <span className="text-theme-light text-sm">
                  <Trans>Last Modified:</Trans>
                </span>
                <div className="mt-1">{new Date(lastModified).toLocaleString()}</div>
              </div>
            )}

            <div>
              <span className="text-theme-light text-sm">
                <Trans>Full Path:</Trans>
              </span>
              <div className="mt-1 overflow-x-hidden [overflow-wrap:anywhere]">{objectKey}</div>
            </div>
          </Stack>
        </div>

        <div>
          <TextInput
            label={t`Type DELETE to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            helptext={
              isFolder
                ? versioningEnabled
                  ? t`All objects in the folder can be restored from version history.`
                  : t`All objects in the folder will be permanently deleted.`
                : versioningEnabled && !isFolder
                  ? t`The object can be restored from version history.`
                  : t`This action cannot be undone.`
            }
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

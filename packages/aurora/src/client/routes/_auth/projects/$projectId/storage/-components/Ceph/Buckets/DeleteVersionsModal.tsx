import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteVersionsModalProps {
  isOpen: boolean
  bucket: Bucket | null
  onClose: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const DeleteVersionsModal = ({ isOpen, bucket, onClose, onSuccess, onError }: DeleteVersionsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.versions.delete",
  })

  const utils = trpcReact.useUtils()

  const deleteVersionsMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation({
    onSettled: () => {
      // Invalidate both containers.list (to update bucket metadata) and objects.list (to refresh empty state)
      utils.storage.ceph.containers.list.invalidate()
      utils.storage.ceph.objects.list.invalidate()
      handleClose()
    },
  })

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    deleteVersionsMutation.reset()
    resetTracking()
    onClose()
  }

  const handleConfirmNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmName(value)
    if (nameError) setNameError(null)
  }

  const handleSubmit = () => {
    if (!bucket) return
    if (confirmName.trim() !== bucket.name) {
      setNameError(t`Bucket name does not match`)
      return
    }

    markSubmitted()

    // Capture bucket name before async operation to avoid dereferencing null bucket in callbacks
    const bucketName = bucket.name

    // Always delete all versions and delete markers (includeVersionsAndDeleteMarkers: true)
    deleteVersionsMutation.mutate(
      {
        project_id: projectId,
        containerName: bucketName,
        includeVersionsAndDeleteMarkers: true,
      },
      {
        onSuccess: (deletedCount) => {
          onSuccess?.(bucketName, deletedCount)
        },
        onError: (error) => {
          onError?.(bucketName, error.message)
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !bucket) return null

  return (
    <Modal
      title={t`Delete Versions`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Delete Versions`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={deleteVersionsMutation.isPending || confirmName.trim() !== bucket.name}
    >
      <Stack direction="vertical" gap="6">
        <p className="text-theme-default m-0">
          <Trans>
            This action will permanently delete all versions and delete markers. This will enable you to delete the
            bucket. This action cannot be undone.
          </Trans>
        </p>

        <TextInput
          label={t`Type the bucket name to confirm`}
          required
          value={confirmName}
          onChange={handleConfirmNameChange}
          onKeyDown={handleKeyDown}
          invalid={!!nameError}
          errortext={nameError || undefined}
          disabled={deleteVersionsMutation.isPending}
          placeholder={bucket.name}
          autoFocus
          className="overflow-x-hidden [overflow-wrap:anywhere]"
        />
      </Stack>
    </Modal>
  )
}

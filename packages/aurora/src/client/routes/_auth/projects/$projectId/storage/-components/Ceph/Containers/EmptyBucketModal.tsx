import { useState } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, ModalFooter, ButtonRow, TextInput, Stack, Button } from "@cloudoperators/juno-ui-components"
import { Container } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"

interface EmptyBucketModalProps {
  isOpen: boolean
  bucket: Container | null
  onClose: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const EmptyBucketModal = ({ isOpen, bucket, onClose, onSuccess, onError }: EmptyBucketModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const utils = trpcReact.useUtils()

  const handleCopyName = () => {
    if (!bucket) return
    navigator.clipboard.writeText(bucket.name).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const emptyBucketMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation({
    onSettled: () => {
      utils.storage.ceph.containers.list.invalidate()
      handleClose()
    },
  })

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    setCopied(false)
    emptyBucketMutation.reset()
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

    // Capture bucket name before async operation to avoid dereferencing null bucket in callbacks
    const bucketName = bucket.name

    emptyBucketMutation.mutate(
      {
        project_id: projectId,
        containerName: bucketName,
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

  // Show info message if bucket is already empty
  const isEmpty = bucket.count === 0
  const bucketCount = bucket.count
  const bucketName = bucket.name

  return (
    <Modal
      title={t`Empty Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isEmpty ? undefined : t`Empty`}
      confirmButtonVariant="primary-danger"
      onConfirm={isEmpty ? undefined : handleSubmit}
      cancelButtonLabel={isEmpty ? undefined : t`Cancel`}
      modalFooter={
        isEmpty ? (
          <ModalFooter className="flex justify-end">
            <ButtonRow>
              <Button variant="primary" onClick={handleClose} data-testid="empty-info-close-button">
                <Trans>Close</Trans>
              </Button>
            </ButtonRow>
          </ModalFooter>
        ) : undefined
      }
      size="small"
      disableConfirmButton={emptyBucketMutation.isPending || (!isEmpty && confirmName.trim() !== bucket.name)}
    >
      {isEmpty ? (
        <p className="text-theme-default py-2">
          <Trans>Nothing to do. Bucket is already empty.</Trans>
        </p>
      ) : (
        <Stack direction="vertical" gap="6">
          <p className="text-theme-default">
            <Trans>
              <strong>Are you sure?</strong> All {bucketCount}{" "}
              <Plural value={bucketCount} one="object" other="objects" /> in bucket "{bucketName}" will be permanently
              deleted. This action cannot be undone.
            </Trans>
          </p>

          <Stack direction="vertical" gap="2">
            <div className="flex items-center justify-between">
              <span className="text-theme-light text-sm">
                <Trans>Bucket to empty:</Trans>
              </span>
              <Button
                size="small"
                variant="subdued"
                onClick={handleCopyName}
                icon={copied ? "check" : "contentCopy"}
                label={copied ? t`Copied` : t`Copy`}
              />
            </div>
            <div className="bg-theme-background-lvl-1 rounded p-2 text-sm">{bucket.name}</div>
          </Stack>

          <TextInput
            label={t`Type the bucket name to confirm`}
            required
            value={confirmName}
            onChange={handleConfirmNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={emptyBucketMutation.isPending}
            placeholder={bucket.name}
            autoFocus
          />
        </Stack>
      )}
    </Modal>
  )
}

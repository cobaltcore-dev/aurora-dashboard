import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message, Button } from "@cloudoperators/juno-ui-components"
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
    onSuccess: (deletedCount) => {
      utils.storage.ceph.containers.list.invalidate()
      onSuccess?.(bucket!.name, deletedCount)
    },
    onError: (error) => {
      onError?.(bucket!.name, error.message)
    },
    onSettled: () => {
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
    emptyBucketMutation.mutate({
      project_id: projectId,
      containerName: bucket.name,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !bucket) return null

  // Show info message if bucket is already empty
  const isEmpty = bucket.count === 0

  return (
    <Modal
      title={t`Empty Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isEmpty ? t`Got it!` : t`Empty`}
      onConfirm={isEmpty ? handleClose : handleSubmit}
      cancelButtonLabel={isEmpty ? undefined : t`Cancel`}
      size="small"
      disableConfirmButton={
        emptyBucketMutation.isPending || (!isEmpty && confirmName.trim() !== bucket.name)
      }
    >
      {isEmpty ? (
        <Message variant="info">
          <Trans>Nothing to do. Bucket is already empty.</Trans>
        </Message>
      ) : (
        <Stack direction="vertical" gap="6">
          <Message variant="warning">
            <Trans>
              <strong>Are you sure?</strong> All {bucket.count}{" "}
              {bucket.count === 1 ? "object" : "objects"} in bucket "{bucket.name}" will be
              permanently deleted. This action cannot be undone.
            </Trans>
          </Message>

          <Stack direction="vertical" gap="2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-juno-grey-light-1">
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
            <div className="rounded bg-juno-grey-blue-10 p-2 font-mono text-sm">{bucket.name}</div>
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

import { useState, useEffect } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message, Spinner, Button } from "@cloudoperators/juno-ui-components"
import type { Container } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"

interface DeleteBucketModalProps {
  isOpen: boolean
  bucket: Container | null
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const DeleteBucketModal = ({ isOpen, bucket, onClose, onSuccess, onError }: DeleteBucketModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyName = () => {
    if (!bucket) return
    navigator.clipboard.writeText(bucket.name).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const utils = trpcReact.useUtils()

  // Fetch actual objects to get accurate real-time state
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.ceph.objects.list.useQuery(
    { project_id: projectId ?? "", containerName: bucket?.name ?? "", maxKeys: 1 },
    { enabled: isOpen && bucket !== null }
  )

  const deleteBucketMutation = trpcReact.storage.ceph.containers.delete.useMutation({
    onSettled: () => {
      utils.storage.ceph.containers.list.invalidate()
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setConfirmName("")
      setNameError(null)
      deleteBucketMutation.reset()
    }
  }, [isOpen, bucket?.name])

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    deleteBucketMutation.reset()
    onClose()
  }

  const handleConfirmNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmName(value)
    if (nameError) setNameError(null)
  }

  const handleSubmit = () => {
    if (!bucket) return
    if (objectsError) return
    if (confirmName.trim() !== bucket.name) {
      setNameError(t`Bucket name does not match`)
      return
    }

    // Capture bucket name before async operation to avoid dereferencing null bucket in callbacks
    const bucketName = bucket.name

    deleteBucketMutation.mutate(
      { project_id: projectId, bucketName },
      {
        onSuccess: () => {
          onSuccess?.(bucketName)
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

  const actualObjectCount = objects?.objects?.length ?? 0
  const isNonEmpty = actualObjectCount > 0
  const errorMessage = objectsError?.message

  return (
    <Modal
      title={t`Delete Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Delete Bucket`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={
        deleteBucketMutation.isPending || isLoadingObjects || isNonEmpty || confirmName.trim() !== bucket.name
      }
    >
      <Stack direction="vertical" gap="6">
        {isLoadingObjects ? (
          <Stack direction="horizontal" gap="2" alignment="center">
            <Spinner />
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>Checking bucket contents...</Trans>
            </span>
          </Stack>
        ) : isNonEmpty ? (
          <Message variant="error">
            <Trans>
              This bucket contains {actualObjectCount} <Plural value={actualObjectCount} one="object" other="objects" />{" "}
              and cannot be deleted. Delete all objects first.
            </Trans>
          </Message>
        ) : (
          <>
            <Message variant="warning">
              <Trans>
                This action is irreversible. Deleting a bucket permanently removes it and cannot be undone. The bucket
                must be empty before deletion.
              </Trans>
            </Message>

            <Stack direction="vertical" gap="2">
              <div className="flex items-center justify-between">
                <span className="text-juno-grey-light-1 text-sm">
                  <Trans>Bucket to delete:</Trans>
                </span>
                <Button
                  size="small"
                  variant="subdued"
                  onClick={handleCopyName}
                  icon={copied ? "check" : "contentCopy"}
                  label={copied ? t`Copied` : t`Copy`}
                />
              </div>
              <div className="bg-juno-grey-blue-10 rounded p-2 font-mono text-sm">{bucket.name}</div>
            </Stack>

            <TextInput
              label={t`Type the bucket name to confirm`}
              required
              value={confirmName}
              onChange={handleConfirmNameChange}
              onKeyDown={handleKeyDown}
              invalid={!!nameError}
              errortext={nameError || undefined}
              disabled={deleteBucketMutation.isPending}
              placeholder={bucket.name}
            />
          </>
        )}

        {objectsError && (
          <Message variant="error">
            <Trans>Failed to check bucket contents: {errorMessage}</Trans>
          </Message>
        )}
      </Stack>
    </Modal>
  )
}

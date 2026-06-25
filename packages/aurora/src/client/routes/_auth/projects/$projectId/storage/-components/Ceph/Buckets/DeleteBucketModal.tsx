import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, ModalFooter, ButtonRow, TextInput, Stack, Spinner, Button } from "@cloudoperators/juno-ui-components"
import type { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"

interface DeleteBucketModalProps {
  isOpen: boolean
  bucket: Bucket | null
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

  // Fetch actual objects and versions to get accurate real-time state
  // Use showVersions=true to also detect delete markers in versioned buckets
  // Use delimiter="" to get ALL objects including folder markers (zero-byte objects ending in "/")
  // Without this, folders are returned as CommonPrefixes and we can't accurately check if bucket is empty
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.ceph.objects.list.useQuery(
    { project_id: projectId ?? "", containerName: bucket?.name ?? "", maxKeys: 1, delimiter: "", showVersions: true },
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

  // When showVersions=true, check both objects and versions (including delete markers)
  // When delimiter="", folders are returned as objects/versions (keys ending in "/")
  const actualObjectCount = (objects?.objects?.length ?? 0) + (objects?.versions?.length ?? 0)
  const isNonEmpty = actualObjectCount > 0
  const errorMessage = objectsError?.message

  return (
    <Modal
      title={t`Delete Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isNonEmpty ? undefined : t`Delete Bucket`}
      confirmButtonVariant={isNonEmpty ? undefined : "primary-danger"}
      onConfirm={isNonEmpty ? undefined : handleSubmit}
      cancelButtonLabel={isNonEmpty ? undefined : t`Cancel`}
      modalFooter={
        isNonEmpty ? (
          <ModalFooter className="flex justify-end">
            <ButtonRow>
              <Button variant="primary" onClick={handleClose} data-testid="delete-has-objects-close-button">
                <Trans>Close</Trans>
              </Button>
            </ButtonRow>
          </ModalFooter>
        ) : undefined
      }
      size="small"
      disableConfirmButton={
        deleteBucketMutation.isPending || isLoadingObjects || !!objectsError || confirmName.trim() !== bucket.name
      }
    >
      <Stack direction="vertical" gap="6">
        {objectsError && (
          <p className="text-theme-error" role="alert" aria-live="assertive">
            <Trans>Failed to check bucket contents: {errorMessage}</Trans>
          </p>
        )}

        {isLoadingObjects ? (
          <Stack direction="horizontal" gap="2" alignment="center">
            <Spinner />
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>Checking bucket contents...</Trans>
            </span>
          </Stack>
        ) : isNonEmpty ? (
          <p className="text-theme-default">
            <Trans>
              This bucket contains objects (possibly including old versions and delete markers) and cannot be deleted.
              Use <strong>Empty</strong> action to remove all content first.
            </Trans>
          </p>
        ) : (
          <>
            <p className="text-theme-default">
              <Trans>
                This action is irreversible. Deleting a bucket permanently removes it and cannot be undone. The bucket
                must be empty before deletion.
              </Trans>
            </p>

            <Stack direction="vertical" gap="2">
              <div className="flex items-center justify-between">
                <span className="text-theme-light text-sm">
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
              disabled={deleteBucketMutation.isPending}
              placeholder={bucket.name}
            />
          </>
        )}
      </Stack>
    </Modal>
  )
}

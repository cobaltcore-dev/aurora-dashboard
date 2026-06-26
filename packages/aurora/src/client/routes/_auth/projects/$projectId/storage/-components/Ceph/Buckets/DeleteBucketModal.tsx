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
          handleClose()
          onSuccess?.(bucketName)
        },
        onError: (error) => {
          handleClose()
          onError?.(bucketName, error.message)
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !bucket) return null

  // Check if bucket has current objects (not just versions/delete markers)
  // When delimiter="", folders are returned as objects (keys ending in "/")
  const currentObjectCount = objects?.objects?.length ?? 0
  const versionCount = objects?.versions?.length ?? 0

  // Bucket is non-empty if it has current objects
  // If it only has versions/delete markers (no current objects), it's considered "empty" for deletion purposes
  const isNonEmpty = currentObjectCount > 0
  const hasOnlyVersions = currentObjectCount === 0 && versionCount > 0
  const errorMessage = objectsError?.message

  return (
    <Modal
      title={t`Delete Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isNonEmpty || hasOnlyVersions ? undefined : t`Delete Bucket`}
      confirmButtonVariant={isNonEmpty || hasOnlyVersions ? undefined : "primary-danger"}
      onConfirm={isNonEmpty || hasOnlyVersions ? undefined : handleSubmit}
      cancelButtonLabel={isNonEmpty || hasOnlyVersions ? undefined : t`Cancel`}
      modalFooter={
        isNonEmpty || hasOnlyVersions ? (
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
              This bucket contains objects and cannot be deleted. Use <strong>Empty Bucket</strong> action to remove all
              content first.
            </Trans>
          </p>
        ) : hasOnlyVersions ? (
          <p className="text-theme-default">
            <Trans>
              This bucket contains old versions and delete markers. Use <strong>Delete Versions</strong> action to
              remove them before deleting the bucket.
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

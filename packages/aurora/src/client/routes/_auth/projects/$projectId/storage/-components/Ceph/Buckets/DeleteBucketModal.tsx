import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, ModalFooter, ButtonRow, TextInput, Stack, Spinner, Button } from "@cloudoperators/juno-ui-components"
import type { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { calculateBucketState } from "../hooks/bucketStateHelpers"
import { useModalTracking } from "@/client/hooks/useModalTracking"

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

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.delete",
  })

  const utils = trpcReact.useUtils()

  // Fetch versioning status to determine if bucket has versioning enabled
  const { data: versioningStatus, isLoading: isLoadingVersioning } =
    trpcReact.storage.ceph.versioning.getStatus.useQuery(
      { project_id: projectId ?? "", bucket: bucket?.name ?? "" },
      { enabled: isOpen && bucket !== null }
    )

  const isVersioningEnabled = versioningStatus?.status === "Enabled" || versioningStatus?.status === "Suspended"

  // Fetch actual objects and versions to get accurate real-time state
  // Use showVersions=true to also detect delete markers in versioned buckets
  // Use delimiter="" to get ALL objects including folder markers (zero-byte objects ending in "/")
  // Without this, folders are returned as CommonPrefixes and we can't accurately check if bucket is empty
  // Use maxKeys=100 to get enough objects/versions to accurately determine bucket state
  // (with maxKeys=1 we might miss current objects if the first result is a delete marker)
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.ceph.objects.list.useQuery(
    { project_id: projectId ?? "", containerName: bucket?.name ?? "", maxKeys: 100, delimiter: "", showVersions: true },
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
      resetTracking()
    }
  }, [isOpen, bucket?.name])

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    deleteBucketMutation.reset()
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
    if (objectsError) return
    if (confirmName.trim() !== bucket.name) {
      setNameError(t`Bucket name does not match`)
      return
    }

    markSubmitted()

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

  // Calculate bucket state using shared helper
  // When showVersions=true, BFF returns all objects in "versions" array, not "objects"
  // So bucketObjectCount from objects?.objects is used only as a fallback
  const currentObjectCount = objects?.objects?.length ?? 0
  const allVersions = objects?.versions ?? []
  const { effectiveCurrentObjectCount, hasOldVersionsOrDeleteMarkers } = calculateBucketState(
    allVersions,
    isVersioningEnabled,
    currentObjectCount
  )

  // Bucket cannot be deleted if it has:
  // 1. Current objects (effectiveCurrentObjectCount > 0) - show "Empty the bucket"
  // 2. Old versions or any delete markers in a versioned bucket - show "Delete all versions"
  const hasCurrentObjects = effectiveCurrentObjectCount > 0
  const hasVersionsInVersionedBucket = hasOldVersionsOrDeleteMarkers
  const cannotDelete = hasCurrentObjects || hasVersionsInVersionedBucket
  const errorMessage = objectsError?.message
  const isLoading = isLoadingObjects || isLoadingVersioning

  return (
    <Modal
      title={t`Delete Bucket`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={cannotDelete ? undefined : t`Delete Bucket`}
      confirmButtonVariant={cannotDelete ? undefined : "primary-danger"}
      onConfirm={cannotDelete ? undefined : handleSubmit}
      cancelButtonLabel={cannotDelete ? undefined : t`Cancel`}
      modalFooter={
        cannotDelete ? (
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
        deleteBucketMutation.isPending || isLoading || !!objectsError || confirmName.trim() !== bucket.name
      }
    >
      <Stack direction="vertical" gap="6">
        {objectsError && (
          <p className="text-theme-error" role="alert" aria-live="assertive">
            <Trans>Failed to check bucket contents: {errorMessage}</Trans>
          </p>
        )}

        {isLoading ? (
          <Stack direction="horizontal" gap="2" alignment="center">
            <Spinner />
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>Checking bucket contents...</Trans>
            </span>
          </Stack>
        ) : cannotDelete ? (
          <div className="text-theme-default">
            <p className="mb-4">
              <Trans>This bucket cannot be deleted yet. Do the following to be able to delete the bucket:</Trans>
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {hasCurrentObjects && (
                <li>
                  <Trans>Empty the bucket</Trans>
                </li>
              )}
              {hasVersionsInVersionedBucket && (
                <li>
                  <Trans>Delete all versions and delete markers</Trans>
                </li>
              )}
            </ul>
          </div>
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

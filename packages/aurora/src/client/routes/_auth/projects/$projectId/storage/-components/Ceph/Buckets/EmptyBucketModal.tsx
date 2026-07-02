import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Checkbox, Spinner } from "@cloudoperators/juno-ui-components"
import { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { calculateBucketState } from "../hooks/bucketStateHelpers"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface EmptyBucketModalProps {
  isOpen: boolean
  bucket: Bucket | null
  onClose: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const EmptyBucketModal = ({ isOpen, bucket, onClose, onSuccess, onError }: EmptyBucketModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [deleteVersionsAndMarkers, setDeleteVersionsAndMarkers] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.empty",
  })

  const utils = trpcReact.useUtils()

  // Query versioning status for the bucket
  const {
    data: versioningStatus,
    isLoading: isLoadingVersioning,
    error: versioningError,
  } = trpcReact.storage.ceph.versioning.getStatus.useQuery(
    {
      project_id: projectId ?? "",
      bucket: bucket?.name ?? "",
    },
    {
      enabled: !!projectId && !!bucket && isOpen,
      staleTime: 30 * 1000,
    }
  )

  // Query to check if bucket has versions/delete markers (only when versioning is enabled/suspended)
  // Use maxKeys=100 to get enough data - with maxKeys=1 we might miss current objects
  // if the first result is a delete marker
  const {
    data: versionCheckData,
    isLoading: isLoadingVersionCheck,
    error: versionCheckError,
  } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucket?.name ?? "",
      maxKeys: 100,
      delimiter: "",
      showVersions: true,
    },
    {
      enabled: !!projectId && !!bucket && isOpen && versioningStatus?.status !== "Unversioned",
      staleTime: 30 * 1000,
    }
  )

  // Check bucket state using shared helper
  const isVersioningEnabled = versioningStatus?.status === "Enabled" || versioningStatus?.status === "Suspended"
  const allVersions = versionCheckData?.versions ?? []
  const bucketObjectCount = bucket?.count ?? 0
  const { isBucketEmpty, hasOnlyDeleteMarkers } = calculateBucketState(
    allVersions,
    isVersioningEnabled,
    bucketObjectCount
  )
  const isBucketEmptyWithVersions = isBucketEmpty && hasOnlyDeleteMarkers

  const emptyBucketMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation({
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
    setDeleteVersionsAndMarkers(false)
    emptyBucketMutation.reset()
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

    // If bucket is empty with only delete markers, always delete versions
    const shouldDeleteVersions = isBucketEmptyWithVersions || deleteVersionsAndMarkers

    emptyBucketMutation.mutate(
      {
        project_id: projectId,
        containerName: bucketName,
        includeVersionsAndDeleteMarkers: shouldDeleteVersions,
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

  const bucketName = bucket.name
  const isLoading = isLoadingVersioning || isLoadingVersionCheck
  const hasQueryError = !!versioningError || !!versionCheckError

  // If bucket is empty with only delete markers, show "Delete Versions" UI
  if (isBucketEmptyWithVersions && !isLoading) {
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
        disableConfirmButton={emptyBucketMutation.isPending || confirmName.trim() !== bucket.name || hasQueryError}
      >
        <Stack direction="vertical" gap="6">
          {hasQueryError && (
            <div className="bg-theme-danger-10 text-theme-danger rounded p-4">
              <Trans>Unable to verify bucket versioning status. Please try again.</Trans>
            </div>
          )}

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
            disabled={emptyBucketMutation.isPending || hasQueryError}
            placeholder={bucket.name}
            autoFocus
          />
        </Stack>
      </Modal>
    )
  }

  // Otherwise show normal "Empty Bucket" UI
  return (
    <Modal
      title={t`Empty Bucket`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Empty Bucket`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={emptyBucketMutation.isPending || confirmName.trim() !== bucket.name || hasQueryError}
    >
      {isLoading ? (
        <Stack direction="horizontal" gap="2" alignment="center">
          <Spinner />
          <span className="text-juno-grey-light-1 text-sm">
            <Trans>Checking bucket contents...</Trans>
          </span>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="6">
          {hasQueryError && (
            <div className="bg-theme-danger-10 text-theme-danger rounded p-4">
              <Trans>Unable to verify bucket versioning status. Please try again.</Trans>
            </div>
          )}

          <p className="text-theme-default m-0">
            {versioningStatus && versioningStatus.status !== "Unversioned" ? (
              <Trans>
                This action will permanently delete all objects from {bucketName}. You may choose to also delete all
                versions and delete markers. This will enable you to delete the bucket. This action cannot be undone.
              </Trans>
            ) : (
              <Trans>
                This action will permanently delete all objects from {bucketName}. This action cannot be undone.
              </Trans>
            )}
          </p>

          {versioningStatus && versioningStatus.status !== "Unversioned" && (
            <Checkbox
              checked={deleteVersionsAndMarkers}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteVersionsAndMarkers(e.target.checked)}
              label={t`Also delete all versions and all delete markers`}
              disabled={emptyBucketMutation.isPending || hasQueryError}
            />
          )}

          <TextInput
            label={t`Type the bucket name to confirm`}
            required
            value={confirmName}
            onChange={handleConfirmNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={emptyBucketMutation.isPending || hasQueryError}
            placeholder={bucket.name}
            autoFocus
          />
        </Stack>
      )}
    </Modal>
  )
}

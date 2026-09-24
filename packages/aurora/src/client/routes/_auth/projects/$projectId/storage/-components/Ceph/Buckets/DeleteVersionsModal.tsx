import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBulkDeleteErrors } from "../Objects/utils/bulkDeleteErrors"
import { invalidateBucketQueries } from "../hooks/invalidateBucketQueries"

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

  const deleteVersionsMutation = trpcReact.storage.ceph.objects.deleteNonCurrentVersions.useMutation({
    onSettled: () => {
      invalidateBucketQueries(utils)
      handleClose()
    },
  })

  const handleClose = () => {
    trackClose()
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

    deleteVersionsMutation.mutate(
      {
        project_id: projectId,
        containerName: bucketName,
      },
      {
        onSuccess: (result) => {
          // S3's DeleteObjects can fail some keys while succeeding on others in the
          // same HTTP 200 response (see deleteObjectsBulkOutputSchema) - treat any
          // failure as an error rather than reporting a silent partial success.
          if (result.errorCount > 0) {
            const { errorCount } = result
            const errorMessage =
              result.errors.length > 0
                ? formatBulkDeleteErrors(result.errors)
                : t`${errorCount} item(s) could not be deleted`
            onError?.(bucketName, errorMessage)
            return
          }
          // The scan stopped before the end of the bucket (aborted, or a malformed truncated
          // page), so versions may survive. Reporting the count alone would read as a completed
          // wipe - the same "incomplete presented as complete" this branch removed elsewhere.
          if (result.isPartial) {
            const { deletedCount } = result
            onError?.(
              bucketName,
              t`Deleted ${deletedCount} version(s), but the bucket was not processed completely. Some non-current versions may remain — run Delete Versions again.`
            )
            return
          }
          onSuccess?.(bucketName, result.deletedCount)
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
      onCancel={handleClose}
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
            This action will permanently delete all non-current versions and delete markers in this bucket. Each
            object's current version is kept, so nothing visible changes. Objects that are currently deleted will be
            fully removed and can no longer be restored from the Deleted tab afterwards. This action cannot be undone.
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

import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBulkDeleteErrors } from "../Objects/utils/bulkDeleteErrors"
import { invalidateBucketQueries } from "../hooks/invalidateBucketQueries"
import type { PartialVersionDeleteOutcome } from "./BucketToastNotifications"

interface DeleteVersionsModalProps {
  isOpen: boolean
  bucket: Bucket | null
  onClose: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
  onError?: (bucketName: string, errorMessage: string) => void
  onPartial: (bucketName: string, outcome: PartialVersionDeleteOutcome) => void
}

export const DeleteVersionsModal = ({
  isOpen,
  bucket,
  onClose,
  onSuccess,
  onError,
  onPartial,
}: DeleteVersionsModalProps) => {
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
          const { deletedCount, errorCount, errors, isPartial } = result
          // errorCount and isPartial are two independent dimensions, not alternatives. S3's
          // DeleteObjects reports per-item failures inline in an otherwise successful HTTP 200
          // (see deleteObjectsBulkOutputSchema), and the server additionally sets isPartial for
          // every key it had to skip — so the ordinary partial run carries both. Testing one
          // before the other dropped whichever came second, and the dropped half was usually
          // "run it again", the whole reason this branch exists.
          if (deletedCount === 0 && errorCount > 0 && !isPartial) {
            // Nothing got through and the bucket was fully scanned: a plain failure.
            onError?.(
              bucketName,
              errors.length > 0 ? formatBulkDeleteErrors(errors) : t`${errorCount} item(s) could not be deleted`
            )
            return
          }
          if (errorCount > 0 || isPartial) {
            onPartial(bucketName, { deletedCount, errorCount, errors, incomplete: isPartial })
            return
          }
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

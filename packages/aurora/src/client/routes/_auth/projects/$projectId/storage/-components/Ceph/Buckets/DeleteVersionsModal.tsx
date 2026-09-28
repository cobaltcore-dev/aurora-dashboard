import { useState } from "react"
import { Trans, Plural, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message } from "@cloudoperators/juno-ui-components"
import { Bucket, DeleteObjectError } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { formatBulkDeleteErrors } from "../Objects/utils/bulkDeleteErrors"
import { invalidateBucketQueries } from "../hooks/invalidateBucketQueries"

const MAX_LISTED_DELETE_ERRORS = 3

type DeleteVersionsOutcome =
  | { kind: "error"; detail: string }
  | { kind: "partial"; deletedCount: number; errorCount: number; errors: DeleteObjectError[]; incomplete: boolean }

interface DeleteVersionsModalProps {
  isOpen: boolean
  bucket: Bucket | null
  onClose: () => void
  onSuccess?: (bucketName: string, deletedCount: number) => void
}

export const DeleteVersionsModal = ({ isOpen, bucket, onClose, onSuccess }: DeleteVersionsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<DeleteVersionsOutcome | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.versions.delete",
  })

  const utils = trpcReact.useUtils()

  const deleteVersionsMutation = trpcReact.storage.ceph.objects.deleteNonCurrentVersions.useMutation({
    onSettled: () => {
      invalidateBucketQueries(utils)
    },
  })

  const handleClose = () => {
    trackClose()
    setConfirmName("")
    setNameError(null)
    setOutcome(null)
    deleteVersionsMutation.reset()
    resetTracking()
    onClose()
  }

  const handleConfirmNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmName(value)
    if (nameError) setNameError(null)
    if (outcome) setOutcome(null)
  }

  const handleSubmit = () => {
    if (!bucket) return
    if (confirmName.trim() !== bucket.name) {
      setNameError(t`Bucket name does not match`)
      return
    }

    setOutcome(null)
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
          // every key it had to skip - so the ordinary partial run carries both. Testing one
          // before the other dropped whichever came second, and the dropped half was usually
          // "run it again", the whole reason this branch exists.
          if (deletedCount === 0 && errorCount > 0 && !isPartial) {
            // Nothing got through and the bucket was fully scanned: a plain failure.
            setOutcome({
              kind: "error",
              detail:
                errors.length > 0 ? formatBulkDeleteErrors(errors) : t`${errorCount} item(s) could not be deleted`,
            })
            return
          }
          if (errorCount > 0 || isPartial) {
            setOutcome({ kind: "partial", deletedCount, errorCount, errors, incomplete: isPartial })
            return
          }
          onSuccess?.(bucketName, deletedCount)
          handleClose()
        },
        onError: (error) => {
          setOutcome({ kind: "error", detail: error.message })
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !bucket) return null

  const isPending = deleteVersionsMutation.isPending

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
      disableConfirmButton={isPending || confirmName.trim() !== bucket.name}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
      closeOnEsc={!isPending}
    >
      <Stack direction="vertical" gap="6">
        {outcome && (
          <Message
            variant="error"
            title={outcome.kind === "error" ? t`Failed to Delete Versions` : t`Versions Partially Deleted`}
            role="alert"
            aria-live="assertive"
            data-testid="delete-versions-outcome"
          >
            {outcome.kind === "error" ? (
              <ErrorOutcomeBody bucketName={bucket.name} errorMessage={outcome.detail} />
            ) : (
              <DeleteVersionsPartialBody bucketName={bucket.name} outcome={outcome} />
            )}
          </Message>
        )}

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
          disabled={isPending}
          placeholder={bucket.name}
          autoFocus
          className="overflow-x-hidden [overflow-wrap:anywhere]"
        />
      </Stack>
    </Modal>
  )
}

const ErrorOutcomeBody = ({ bucketName, errorMessage }: { bucketName: string; errorMessage: string }) => (
  <Trans>
    Could not delete versions from bucket "{bucketName}": {errorMessage}
  </Trans>
)

const DeleteVersionsPartialBody = ({
  bucketName,
  outcome,
}: {
  bucketName: string
  outcome: Extract<DeleteVersionsOutcome, { kind: "partial" }>
}) => {
  const { deletedCount, errorCount, errors, incomplete } = outcome
  const listedErrors = errors.slice(0, MAX_LISTED_DELETE_ERRORS)
  const listed = formatBulkDeleteErrors(listedErrors)
  const unlisted = errorCount - listedErrors.length

  return (
    <>
      <Trans>
        Deleted {deletedCount} <Plural value={deletedCount} one="version" other="versions" /> from bucket "{bucketName}
        ".
      </Trans>{" "}
      {errorCount > 0 &&
        (listedErrors.length > 0 ? (
          <>
            <Trans>
              {errorCount} <Plural value={errorCount} one="item" other="items" /> could not be deleted: {listed}
            </Trans>{" "}
          </>
        ) : (
          <>
            <Trans>
              {errorCount} <Plural value={errorCount} one="item" other="items" /> could not be deleted.
            </Trans>{" "}
          </>
        ))}
      {unlisted > 0 && (
        <>
          <Trans>
            {unlisted} further <Plural value={unlisted} one="failure is" other="failures are" /> not listed here.
          </Trans>{" "}
        </>
      )}
      {incomplete && (
        <Trans>
          The scan did not reach the end of the bucket, so non-current versions may remain. Run Delete Versions again.
        </Trans>
      )}
    </>
  )
}

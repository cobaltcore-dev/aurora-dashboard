import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans, Plural } from "@lingui/react/macro"

export const getBucketCreatedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Bucket Created</Trans>,
  description: <Trans>Bucket "{bucketName}" was successfully created.</Trans>,
})

export const getBucketCreateErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Create Bucket</Trans>,
  description: (
    <Trans>
      Could not create bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketEmptiedToast = (
  bucketName: string,
  deletedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Bucket Emptied</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>Bucket "{bucketName}" was already empty.</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Bucket "{bucketName}" was successfully emptied. {deletedCount} object deleted.
      </Trans>
    ) : (
      <Trans>
        Bucket "{bucketName}" was successfully emptied. {deletedCount} objects deleted.
      </Trans>
    ),
})

export const getBucketEmptyErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Empty Bucket</Trans>,
  description: (
    <Trans>
      Could not empty bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketDeletedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Bucket Deleted</Trans>,
  description: <Trans>Bucket "{bucketName}" was successfully deleted.</Trans>,
})

export const getBucketDeleteErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Bucket</Trans>,
  description: (
    <Trans>
      Could not delete bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketsEmptyCompleteToast = (
  emptiedCount: number,
  totalDeleted: number,
  errors: string[]
): { message: ReactNode } & NotificationOptions => {
  const hasErrors = errors.length > 0
  const totalBuckets = emptiedCount + errors.length
  const errorsLength = errors.length

  return {
    message: hasErrors ? <Trans>Empty All Completed with Errors</Trans> : <Trans>All Buckets Emptied</Trans>,
    description: hasErrors ? (
      <Trans>
        Successfully emptied {emptiedCount} of {totalBuckets}{" "}
        <Plural value={totalBuckets} one="bucket" other="buckets" />, deleting {totalDeleted}{" "}
        <Plural value={totalDeleted} one="object" other="objects" />. {errorsLength}{" "}
        <Plural value={errorsLength} one="bucket" other="buckets" /> failed.
      </Trans>
    ) : (
      <Trans>
        Successfully emptied {emptiedCount} <Plural value={emptiedCount} one="bucket" other="buckets" />, deleting{" "}
        {totalDeleted} <Plural value={totalDeleted} one="object" other="objects" />.
      </Trans>
    ),
  }
}

// ── Versioning operations ──────────────────────────────────────────────────

export const getVersioningEnabledToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Versioning Enabled</Trans>,
  description: <Trans>Versioning was successfully enabled for bucket "{bucketName}".</Trans>,
})

export const getVersioningEnableErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Enable Versioning</Trans>,
  description: (
    <Trans>
      Could not enable versioning for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getVersioningSuspendedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Versioning Suspended</Trans>,
  description: <Trans>Versioning was successfully suspended for bucket "{bucketName}".</Trans>,
})

export const getVersioningSuspendErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Suspend Versioning</Trans>,
  description: (
    <Trans>
      Could not suspend versioning for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

// ── Bucket policy operations ───────────────────────────────────────────────

export const getBucketPolicyDeletedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Policy Deleted</Trans>,
  description: <Trans>Bucket policy was successfully deleted from "{bucketName}".</Trans>,
})

export const getBucketPolicyDeleteErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Policy</Trans>,
  description: (
    <Trans>
      Could not delete bucket policy from "{bucketName}": {errorMessage}
    </Trans>
  ),
})

// ── Delete versions operation ──────────────────────────────────────────────

export const getVersionsDeletedToast = (
  bucketName: string,
  deletedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Versions Deleted</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>No versions to delete in bucket "{bucketName}".</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Successfully deleted {deletedCount} version from bucket "{bucketName}".
      </Trans>
    ) : (
      <Trans>
        Successfully deleted {deletedCount} versions from bucket "{bucketName}".
      </Trans>
    ),
})

export const getVersionsDeleteErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Versions</Trans>,
  description: (
    <Trans>
      Could not delete versions from bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

// ── CORS configuration operations ──────────────────────────────────────────

export const getCorsSavedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>CORS Configuration Saved</Trans>,
  description: <Trans>CORS configuration was successfully saved for bucket "{bucketName}".</Trans>,
})

export const getCorsSaveErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Save CORS Configuration</Trans>,
  description: (
    <Trans>
      Could not save CORS configuration for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getCorsDeletedToast = (bucketName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>CORS Configuration Deleted</Trans>,
  description: <Trans>CORS configuration was successfully deleted from bucket "{bucketName}".</Trans>,
})

export const getCorsDeleteErrorToast = (
  bucketName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete CORS Configuration</Trans>,
  description: (
    <Trans>
      Could not delete CORS configuration from bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

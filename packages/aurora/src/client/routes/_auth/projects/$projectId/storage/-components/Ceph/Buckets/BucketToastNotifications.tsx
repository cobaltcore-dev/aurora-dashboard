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

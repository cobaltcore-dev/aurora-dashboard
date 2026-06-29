import { ReactNode } from "react"
import { NotificationOptions, ToastProps } from "@cloudoperators/juno-ui-components"
import { Trans, Plural } from "@lingui/react/macro"
import { Stack } from "@cloudoperators/juno-ui-components/index"

interface NotificationTextProps {
  title: ReactNode
  description: ReactNode
}

export function NotificationText({ title, description }: NotificationTextProps) {
  return (
    <Stack direction="vertical" gap="1.5">
      <span>{title}</span>
      <span className="text-theme-light">{description}</span>
    </Stack>
  )
}

interface ToastConfig {
  onDismiss: () => void
}

export const getBucketCreatedToast = (
  bucketName: string,
  config: ToastConfig
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Bucket Created</Trans>,
  description: <Trans>Bucket "{bucketName}" was successfully created.</Trans>,
  onDismiss: config.onDismiss,
})

export const getBucketCreateErrorToast = (
  bucketName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Create Bucket</Trans>}
      description={
        <Trans>
          Could not create bucket "{bucketName}": {errorMessage}
        </Trans>
      }
    />
  ),
  onDismiss: config.onDismiss,
})

export const getBucketEmptiedToast = (bucketName: string, deletedCount: number, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Bucket Emptied</Trans>}
      description={
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
        )
      }
    />
  ),
  onDismiss: config.onDismiss,
})

export const getBucketEmptyErrorToast = (
  bucketName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Empty Bucket</Trans>}
      description={
        <Trans>
          Could not empty bucket "{bucketName}": {errorMessage}
        </Trans>
      }
    />
  ),
  onDismiss: config.onDismiss,
})

export const getBucketDeletedToast = (bucketName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Bucket Deleted</Trans>}
      description={<Trans>Bucket "{bucketName}" was successfully deleted.</Trans>}
    />
  ),
  onDismiss: config.onDismiss,
})

export const getBucketDeleteErrorToast = (
  bucketName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Bucket</Trans>}
      description={
        <Trans>
          Could not delete bucket "{bucketName}": {errorMessage}
        </Trans>
      }
    />
  ),
  onDismiss: config.onDismiss,
})

export const getBucketsEmptyCompleteToast = (
  emptiedCount: number,
  totalDeleted: number,
  errors: string[],
  config: ToastConfig
): ToastProps => {
  const hasErrors = errors.length > 0
  const totalBuckets = emptiedCount + errors.length
  const errorsLength = errors.length

  return {
    variant: hasErrors ? "warning" : "success",
    children: (
      <NotificationText
        title={hasErrors ? <Trans>Empty All Completed with Errors</Trans> : <Trans>All Buckets Emptied</Trans>}
        description={
          hasErrors ? (
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
          )
        }
      />
    ),
    onDismiss: config.onDismiss,
  }
}

import { ToastProps } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { NotificationText } from "./NotificationText"

interface ToastConfig {
  onDismiss: () => void
  autoDismissTimeout?: number
}

export const getImageUpdatedToast = (imageName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Image Instance</Trans>}
      description={<Trans>Image instance "{imageName}" has been updated</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageUpdateErrorToast = (imageName: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Update Image</Trans>}
      description={
        <Trans>
          The image "{imageName}" could not be updated: {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getImageCreatedToast = (imageName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Image Instance</Trans>}
      description={<Trans>Image instance "{imageName}" has been created</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageCreateErrorToast = (imageName: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Create Image</Trans>}
      description={
        <Trans>
          The image "{imageName}" could not be created: {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getImageFileUploadErrorToast = (fileName: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Upload Image File</Trans>}
      description={
        <Trans>
          Failed to upload file "{fileName}": {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getImageDeletedToast = (imageName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Image Instance</Trans>}
      description={<Trans>Image instance "{imageName}" has been deleted</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageDeleteErrorToast = (imageId: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Delete Image</Trans>}
      description={
        <Trans>
          The image "{imageId}" could not be deleted: {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageActivatedToast = (imageName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Image Instance</Trans>}
      description={<Trans>Image instance "{imageName}" has been activated</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageDeactivatedToast = (imageName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Image Instance</Trans>}
      description={<Trans>Image instance "{imageName}" has been deactivated</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageActivationErrorToast = (imageId: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Re-activate Image</Trans>}
      description={
        <Trans>
          The image "{imageId}" could not be re-activated: {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getImageDeactivationErrorToast = (imageId: string, message: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Unable to Deactivate Image</Trans>}
      description={
        <Trans>
          The image "{imageId}" could not be deactivated: {message}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

// Bulk operation toasts
export const getBulkDeleteSuccessToast = (
  successCount: number,
  totalCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Images Deleted</Trans>}
      description={
        <Trans>
          Successfully deleted {successCount} of {totalCount} image(s)
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getBulkDeleteErrorToast = (failedCount: number, totalCount: number, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Images</Trans>}
      description={
        <Trans>
          Failed to delete {failedCount} of {totalCount} image(s). Some images may be protected or in use.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getBulkDeletePartialToast = (
  successCount: number,
  failedCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "warning",
  children: (
    <NotificationText
      title={<Trans>Partial Delete Success</Trans>}
      description={
        <Trans>
          Deleted {successCount} image(s), but {failedCount} image(s) could not be deleted.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getBulkActivateSuccessToast = (
  successCount: number,
  totalCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Images Activated</Trans>}
      description={
        <Trans>
          Successfully activated {successCount} of {totalCount} image(s)
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getBulkActivateErrorToast = (
  failedCount: number,
  totalCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Activate Images</Trans>}
      description={
        <Trans>
          Failed to activate {failedCount} of {totalCount} image(s). Some images may already be active or in an invalid
          state.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getBulkActivatePartialToast = (
  successCount: number,
  failedCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "warning",
  children: (
    <NotificationText
      title={<Trans>Partial Activation Success</Trans>}
      description={
        <Trans>
          Activated {successCount} image(s), but {failedCount} image(s) could not be activated.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getBulkDeactivateSuccessToast = (
  successCount: number,
  totalCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Images Deactivated</Trans>}
      description={
        <Trans>
          Successfully deactivated {successCount} of {totalCount} image(s)
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 3000,
  onDismiss: config.onDismiss,
})

export const getBulkDeactivateErrorToast = (
  failedCount: number,
  totalCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Deactivate Images</Trans>}
      description={
        <Trans>
          Failed to deactivate {failedCount} of {totalCount} image(s). Some images may already be deactivated or in an
          invalid state.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getBulkDeactivatePartialToast = (
  successCount: number,
  failedCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "warning",
  children: (
    <NotificationText
      title={<Trans>Partial Deactivation Success</Trans>}
      description={
        <Trans>
          Deactivated {successCount} image(s), but {failedCount} image(s) could not be deactivated.
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

// Image access toasts
export const getImageAccessStatusUpdatedToast = (newStatus: string, config: ToastConfig): ToastProps => ({
  variant: "info",
  children: (
    <NotificationText
      title={<Trans>Access Status</Trans>}
      description={<Trans>Access status updated to "{newStatus}".</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getImageAccessStatusErrorToast = (errorMessage: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Access Status</Trans>}
      description={errorMessage || <Trans>Failed to update access status</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

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

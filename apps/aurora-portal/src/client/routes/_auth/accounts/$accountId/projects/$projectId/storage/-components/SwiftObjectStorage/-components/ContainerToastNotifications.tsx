import { ReactNode } from "react"
import { ToastProps } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
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
  autoDismissTimeout?: number
}

export const getContainerCreatedToast = (containerName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Container Created</Trans>}
      description={<Trans>Container "{containerName}" was successfully created.</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerCreateErrorToast = (
  containerName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Create Container</Trans>}
      description={
        <Trans>
          Could not create container "{containerName}": {errorMessage}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerEmptiedToast = (
  containerName: string,
  deletedCount: number,
  config: ToastConfig
): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Container Emptied</Trans>}
      description={
        deletedCount === 0 ? (
          <Trans>Container "{containerName}" was already empty.</Trans>
        ) : (
          <Trans>
            Container "{containerName}" was successfully emptied. {deletedCount}{" "}
            {deletedCount === 1 ? "object" : "objects"} deleted.
          </Trans>
        )
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerEmptyErrorToast = (
  containerName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Empty Container</Trans>}
      description={
        <Trans>
          Could not empty container "{containerName}": {errorMessage}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerDeletedToast = (containerName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Container Deleted</Trans>}
      description={<Trans>Container "{containerName}" was successfully deleted.</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerDeleteErrorToast = (
  containerName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Container</Trans>}
      description={
        <Trans>
          Could not delete container "{containerName}": {errorMessage}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

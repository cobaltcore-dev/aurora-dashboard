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
        ) : deletedCount === 1 ? (
          <Trans>
            Container "{containerName}" was successfully emptied. {deletedCount} object deleted.
          </Trans>
        ) : (
          <Trans>
            Container "{containerName}" was successfully emptied. {deletedCount} objects deleted.
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

export const getContainerUpdatedToast = (containerName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Container Updated</Trans>}
      description={<Trans>Container "{containerName}" properties were successfully updated.</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerUpdateErrorToast = (
  containerName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Update Container</Trans>}
      description={
        <Trans>
          Could not update container "{containerName}": {errorMessage}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerAclUpdatedToast = (containerName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Access Control Updated</Trans>}
      description={<Trans>ACLs for container "{containerName}" were successfully updated.</Trans>}
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainerAclUpdateErrorToast = (
  containerName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Update Access Control</Trans>}
      description={
        <Trans>
          Could not update ACLs for container "{containerName}": {errorMessage}
        </Trans>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainersEmptiedToast = (
  emptiedCount: number,
  totalDeleted: number,
  config: ToastConfig
): ToastProps => ({
  variant: "success",
  children: (
    <NotificationText
      title={<Trans>Containers Emptied</Trans>}
      description={
        totalDeleted === 0 ? (
          <Trans>{emptiedCount} container(s) were already empty.</Trans>
        ) : (
          <Trans>
            {emptiedCount} container(s) successfully emptied. {totalDeleted} object(s) deleted in total.
          </Trans>
        )
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

export const getContainersEmptyErrorToast = (errorMessage: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  children: (
    <NotificationText
      title={<Trans>Failed to Empty Containers</Trans>}
      description={
        <span className="whitespace-pre-line">
          <Trans>One or more containers could not be emptied: {errorMessage}</Trans>
        </span>
      }
    />
  ),
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
})

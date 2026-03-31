import { ReactNode } from "react"
import { ToastProps } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { Stack } from "@cloudoperators/juno-ui-components/index"

interface NotificationTextProps {
  title: ReactNode
  description: ReactNode
}

function NotificationText({ title, description }: NotificationTextProps) {
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

export const getFolderCreatedToast = (folderName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Folder Created</Trans>}
      description={<Trans>Folder "{folderName}" was successfully created.</Trans>}
    />
  ),
})

export const getFolderCreateErrorToast = (
  folderName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Create Folder</Trans>}
      description={
        <Trans>
          Could not create folder "{folderName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getFolderDeletedToast = (folderName: string, deletedCount: number, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Folder Deleted</Trans>}
      description={
        deletedCount === 0 ? (
          <Trans>Folder "{folderName}" was permanently deleted.</Trans>
        ) : deletedCount === 1 ? (
          <Trans>
            Folder "{folderName}" and {deletedCount} object was permanently deleted.
          </Trans>
        ) : (
          <Trans>
            Folder "{folderName}" and {deletedCount} objects were permanently deleted.
          </Trans>
        )
      }
    />
  ),
})

export const getFolderDeleteErrorToast = (
  folderName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Folder</Trans>}
      description={
        <Trans>
          Could not delete folder "{folderName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

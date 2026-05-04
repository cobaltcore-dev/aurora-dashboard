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

export const getObjectDownloadErrorToast = (
  objectName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Download</Trans>}
      description={
        <Trans>
          Could not download "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getObjectDeletedToast = (objectName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Object Deleted</Trans>}
      description={<Trans>Object "{objectName}" was permanently deleted.</Trans>}
    />
  ),
})

export const getObjectDeleteErrorToast = (
  objectName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Object</Trans>}
      description={
        <Trans>
          Could not delete "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getObjectCopiedToast = (
  objectName: string,
  targetContainer: string,
  targetPath: string,
  config: ToastConfig
): ToastProps => {
  const destination = targetPath ? `${targetContainer}/${targetPath}` : targetContainer
  return {
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Object Copied</Trans>}
        description={
          <Trans>
            "{objectName}" was successfully copied to {destination}.
          </Trans>
        }
      />
    ),
  }
}

export const getObjectCopyErrorToast = (objectName: string, errorMessage: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Copy Object</Trans>}
      description={
        <Trans>
          Could not copy "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getObjectMovedToast = (
  objectName: string,
  targetContainer: string,
  targetPath: string,
  config: ToastConfig
): ToastProps => {
  const destination = targetPath ? `${targetContainer}/${targetPath}` : targetContainer
  return {
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Object Moved</Trans>}
        description={
          <Trans>
            "{objectName}" was successfully moved to {destination}.
          </Trans>
        }
      />
    ),
  }
}

export const getObjectMoveErrorToast = (objectName: string, errorMessage: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Move Object</Trans>}
      description={
        <Trans>
          Could not move "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getTempUrlCopiedToast = (objectName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 4000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>URL Copied</Trans>}
      description={<Trans>Temporary URL for "{objectName}" was copied to clipboard.</Trans>}
    />
  ),
})

export const getObjectMetadataUpdatedToast = (objectName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Object Updated</Trans>}
      description={<Trans>Properties of "{objectName}" were successfully updated.</Trans>}
    />
  ),
})

export const getObjectMetadataUpdateErrorToast = (
  objectName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Update Object</Trans>}
      description={
        <Trans>
          Could not update "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getObjectUploadedToast = (objectName: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Object Uploaded</Trans>}
      description={<Trans>"{objectName}" was successfully uploaded.</Trans>}
    />
  ),
})

export const getObjectUploadErrorToast = (
  objectName: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Upload Object</Trans>}
      description={
        <Trans>
          Could not upload "{objectName}": {errorMessage}
        </Trans>
      }
    />
  ),
})

export const getObjectsBulkDeletedToast = (numberDeleted: number, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Objects Deleted</Trans>}
      description={
        numberDeleted === 1 ? (
          <Trans>{numberDeleted} object was permanently deleted.</Trans>
        ) : (
          <Trans>{numberDeleted} objects were permanently deleted.</Trans>
        )
      }
    />
  ),
})

export const getObjectsBulkDeleteErrorToast = (errorMessage: string, config: ToastConfig): ToastProps => ({
  variant: "error",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Failed to Delete Objects</Trans>}
      description={<Trans>One or more objects could not be deleted: {errorMessage}</Trans>}
    />
  ),
})

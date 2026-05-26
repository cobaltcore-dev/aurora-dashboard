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

// ── Folder operations ──────────────────────────────────────────────────────────

export const getFolderCreatedToast = (folderPath: string, config: ToastConfig): ToastProps => ({
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: config.autoDismissTimeout ?? 5000,
  onDismiss: config.onDismiss,
  children: (
    <NotificationText
      title={<Trans>Folder Created</Trans>}
      description={<Trans>Folder "{folderPath}" was successfully created.</Trans>}
    />
  ),
})

export const getFolderCreateErrorToast = (
  folderPath: string,
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
          Could not create folder "{folderPath}": {errorMessage}
        </Trans>
      }
    />
  ),
})

// ── Object delete ──────────────────────────────────────────────────────────────

export const getObjectDeletedToast = (objectKey: string, config: ToastConfig): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Object Deleted</Trans>}
        description={<Trans>Object "{displayName}" was permanently deleted.</Trans>}
      />
    ),
  }
}

export const getObjectDeleteErrorToast = (
  objectKey: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "error",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Failed to Delete Object</Trans>}
        description={
          <Trans>
            Could not delete "{displayName}": {errorMessage}
          </Trans>
        }
      />
    ),
  }
}

// ── Object copy ────────────────────────────────────────────────────────────────

export const getObjectCopiedToast = (
  objectKey: string,
  targetBucket: string,
  targetKey: string,
  config: ToastConfig,
  wasOverwritten?: boolean
): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const destination = `${targetBucket}/${targetKey}`
  return {
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Object Copied</Trans>}
        description={
          wasOverwritten ? (
            <Trans>
              "{displayName}" was successfully copied to {destination} (existing object was replaced).
            </Trans>
          ) : (
            <Trans>
              "{displayName}" was successfully copied to {destination}.
            </Trans>
          )
        }
      />
    ),
  }
}

export const getObjectCopyErrorToast = (objectKey: string, errorMessage: string, config: ToastConfig): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "error",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Failed to Copy Object</Trans>}
        description={
          <Trans>
            Could not copy "{displayName}": {errorMessage}
          </Trans>
        }
      />
    ),
  }
}

// ── Object move ────────────────────────────────────────────────────────────────

export const getObjectMovedToast = (
  objectKey: string,
  targetBucket: string,
  targetKey: string,
  config: ToastConfig
): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const destination = `${targetBucket}/${targetKey}`
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
            "{displayName}" was successfully moved to {destination}.
          </Trans>
        }
      />
    ),
  }
}

export const getObjectMoveErrorToast = (objectKey: string, errorMessage: string, config: ToastConfig): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "error",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Failed to Move Object</Trans>}
        description={
          <Trans>
            Could not move "{displayName}": {errorMessage}
          </Trans>
        }
      />
    ),
  }
}

// ── Object metadata update ─────────────────────────────────────────────────────

export const getObjectMetadataUpdatedToast = (objectKey: string, config: ToastConfig): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Object Updated</Trans>}
        description={<Trans>Properties of "{displayName}" were successfully updated.</Trans>}
      />
    ),
  }
}

export const getObjectMetadataUpdateErrorToast = (
  objectKey: string,
  errorMessage: string,
  config: ToastConfig
): ToastProps => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    variant: "error",
    autoDismiss: true,
    autoDismissTimeout: config.autoDismissTimeout ?? 5000,
    onDismiss: config.onDismiss,
    children: (
      <NotificationText
        title={<Trans>Failed to Update Object</Trans>}
        description={
          <Trans>
            Could not update "{displayName}": {errorMessage}
          </Trans>
        }
      />
    ),
  }
}
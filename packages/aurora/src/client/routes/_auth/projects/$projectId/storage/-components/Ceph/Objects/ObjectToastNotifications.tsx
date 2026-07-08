import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

// ── Folder operations ──────────────────────────────────────────────────────────

export const getFolderCreatedToast = (folderPath: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Folder Created</Trans>,
  description: <Trans>Folder "{folderPath}" was successfully created.</Trans>,
})

export const getFolderCreateErrorToast = (
  folderPath: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Create Folder</Trans>,
  description: (
    <Trans>
      Could not create folder "{folderPath}": {errorMessage}
    </Trans>
  ),
})

// ── Object delete ──────────────────────────────────────────────────────────────

export const getObjectDeletedToast = (objectKey: string): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Object Deleted</Trans>,
    description: <Trans>Object "{displayName}" was permanently deleted.</Trans>,
  }
}

export const getObjectDeleteErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Delete Object</Trans>,
    description: (
      <Trans>
        Could not delete "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Object copy ────────────────────────────────────────────────────────────────

export const getObjectCopiedToast = (
  objectKey: string,
  targetBucket: string,
  targetKey: string,
  wasOverwritten?: boolean
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const destination = `${targetBucket}/${targetKey}`
  return {
    message: <Trans>Object Copied</Trans>,
    description: wasOverwritten ? (
      <Trans>
        "{displayName}" was successfully copied to {destination} (existing object was replaced).
      </Trans>
    ) : (
      <Trans>
        "{displayName}" was successfully copied to {destination}.
      </Trans>
    ),
  }
}

export const getObjectCopyErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Copy Object</Trans>,
    description: (
      <Trans>
        Could not copy "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Object move ────────────────────────────────────────────────────────────────

export const getObjectMovedToast = (
  objectKey: string,
  targetBucket: string,
  targetKey: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const destination = `${targetBucket}/${targetKey}`
  return {
    message: <Trans>Object Moved</Trans>,
    description: (
      <Trans>
        "{displayName}" was successfully moved to {destination}.
      </Trans>
    ),
  }
}

export const getObjectMoveErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Move Object</Trans>,
    description: (
      <Trans>
        Could not move "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Object metadata update ─────────────────────────────────────────────────────

export const getObjectMetadataUpdatedToast = (objectKey: string): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Object Updated</Trans>,
    description: <Trans>Properties of "{displayName}" were successfully updated.</Trans>,
  }
}

export const getObjectMetadataUpdateErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Update Object</Trans>,
    description: (
      <Trans>
        Could not update "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Object download ────────────────────────────────────────────────────────────

// Shown as soon as a download/preview transfer starts. Large objects stream
// through the BFF before anything happens client-side (no native browser
// download progress until the whole file has arrived), so this sets
// expectations up front and reassures the user the UI is still usable.
export const getObjectDownloadStartedToast = (): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Downloading…</Trans>,
  description: (
    <Trans>
      Downloading larger files may take a while. While files are downloading, you may browse other buckets and folders.
    </Trans>
  ),
})

export const getObjectDownloadErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Download Object</Trans>,
    description: (
      <Trans>
        Could not download "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Version restore ────────────────────────────────────────────────────────

export const getVersionRestoredToast = (objectKey: string): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Version Restored</Trans>,
    description: <Trans>"{displayName}" was successfully restored.</Trans>,
  }
}

export const getVersionRestoreErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Restore Version</Trans>,
    description: (
      <Trans>
        Could not restore "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

// ── Version delete ─────────────────────────────────────────────────────────

export const getVersionDeletedToast = (objectKey: string): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Version Deleted</Trans>,
    description: <Trans>Version of "{displayName}" was permanently deleted.</Trans>,
  }
}

export const getVersionDeleteErrorToast = (
  objectKey: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => {
  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  return {
    message: <Trans>Failed to Delete Version</Trans>,
    description: (
      <Trans>
        Could not delete version of "{displayName}": {errorMessage}
      </Trans>
    ),
  }
}

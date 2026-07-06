import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

// ── Folder operations ──────────────────────────────────────────────────────────

export const getFolderCreatedToast = (folderName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Folder Created</Trans>,
  description: <Trans>Folder "{folderName}" was successfully created.</Trans>,
})

export const getFolderCreateErrorToast = (
  folderName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Create Folder</Trans>,
  description: (
    <Trans>
      Could not create folder "{folderName}": {errorMessage}
    </Trans>
  ),
})

export const getFolderDeletedToast = (
  folderName: string,
  deletedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Folder Deleted</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>Folder "{folderName}" was permanently deleted.</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Folder "{folderName}" and {deletedCount} object were permanently deleted.
      </Trans>
    ) : (
      <Trans>
        Folder "{folderName}" and {deletedCount} objects were permanently deleted.
      </Trans>
    ),
})

export const getFolderDeleteErrorToast = (
  folderName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Folder</Trans>,
  description: (
    <Trans>
      Could not delete folder "{folderName}": {errorMessage}
    </Trans>
  ),
})

// ── Object download ────────────────────────────────────────────────────────────

export const getObjectDownloadErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Download</Trans>,
  description: (
    <Trans>
      Could not download "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Object delete ──────────────────────────────────────────────────────────────

export const getObjectDeletedToast = (objectName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Object Deleted</Trans>,
  description: <Trans>Object "{objectName}" was permanently deleted.</Trans>,
})

export const getObjectDeleteErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Object</Trans>,
  description: (
    <Trans>
      Could not delete "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Object copy ────────────────────────────────────────────────────────────────

export const getObjectCopiedToast = (
  objectName: string,
  targetContainer: string,
  targetPath: string
): { message: ReactNode } & NotificationOptions => {
  const destination = targetPath ? `${targetContainer}/${targetPath}` : targetContainer
  return {
    message: <Trans>Object Copied</Trans>,
    description: (
      <Trans>
        "{objectName}" was successfully copied to {destination}.
      </Trans>
    ),
  }
}

export const getObjectCopyErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Copy Object</Trans>,
  description: (
    <Trans>
      Could not copy "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Object move ────────────────────────────────────────────────────────────────

export const getObjectMovedToast = (
  objectName: string,
  targetContainer: string,
  targetPath: string
): { message: ReactNode } & NotificationOptions => {
  const destination = targetPath ? `${targetContainer}/${targetPath}` : targetContainer
  return {
    message: <Trans>Object Moved</Trans>,
    description: (
      <Trans>
        "{objectName}" was successfully moved to {destination}.
      </Trans>
    ),
  }
}

export const getObjectMoveErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Move Object</Trans>,
  description: (
    <Trans>
      Could not move "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Temporary URL ──────────────────────────────────────────────────────────────

export const getTempUrlCopiedToast = (objectName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>URL Copied</Trans>,
  description: <Trans>Temporary URL for "{objectName}" was copied to clipboard.</Trans>,
})

// ── Object metadata update ─────────────────────────────────────────────────────

export const getObjectMetadataUpdatedToast = (objectName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Object Updated</Trans>,
  description: <Trans>Properties of "{objectName}" were successfully updated.</Trans>,
})

export const getObjectMetadataUpdateErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Update Object</Trans>,
  description: (
    <Trans>
      Could not update "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Object upload ──────────────────────────────────────────────────────────────

export const getObjectUploadedToast = (objectName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Object Uploaded</Trans>,
  description: <Trans>"{objectName}" was successfully uploaded.</Trans>,
})

export const getObjectUploadCancelledToast = (objectName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Upload Cancelled</Trans>,
  description: <Trans>Upload of "{objectName}" was cancelled.</Trans>,
})

export const getObjectUploadErrorToast = (
  objectName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Upload Object</Trans>,
  description: (
    <Trans>
      Could not upload "{objectName}": {errorMessage}
    </Trans>
  ),
})

// ── Bulk delete ────────────────────────────────────────────────────────────────

export const getObjectsBulkDeletedToast = (numberDeleted: number): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Objects Deleted</Trans>,
  description:
    numberDeleted === 1 ? (
      <Trans>{numberDeleted} object was permanently deleted.</Trans>
    ) : (
      <Trans>{numberDeleted} objects were permanently deleted.</Trans>
    ),
})

export const getObjectsBulkDeleteErrorToast = (errorMessage: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Objects</Trans>,
  description: (
    <span>
      <Trans>One or more objects could not be deleted:</Trans>
      <span className="mt-1 block text-xs whitespace-pre-wrap">{errorMessage}</span>
    </span>
  ),
})

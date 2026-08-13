import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

// Builder helpers for the NotificationManager (Sonner-based) `toast` API.
// Each returns `{ message, ...options }`; the caller destructures and dispatches
// the appropriate severity, e.g.
//   const { message, ...options } = getImageUpdatedToast(name)
//   toast.success(message, options)
// Severity lives at the call site (toast.success / error / warning / info),
// mirroring the Swift/Ceph notification helpers.

// ── Image lifecycle ─────────────────────────────────────────────────────────

export const getImageUpdatedToast = (imageName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Instance</Trans>,
  description: <Trans>Image instance "{imageName}" has been updated</Trans>,
})

export const getImageUpdateErrorToast = (
  imageName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Update Image</Trans>,
  description: (
    <Trans>
      The image "{imageName}" could not be updated: {errorMessage}
    </Trans>
  ),
})

export const getImageCreatedToast = (imageName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Instance</Trans>,
  description: <Trans>Image instance "{imageName}" has been created</Trans>,
})

export const getImageCreateErrorToast = (
  imageName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Create Image</Trans>,
  description: (
    <Trans>
      The image "{imageName}" could not be created: {errorMessage}
    </Trans>
  ),
})

export const getImageFileUploadErrorToast = (
  fileName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Upload Image File</Trans>,
  description: (
    <Trans>
      Failed to upload file "{fileName}": {errorMessage}
    </Trans>
  ),
})

export const getImageDeletedToast = (imageName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Instance</Trans>,
  description: <Trans>Image instance "{imageName}" has been deleted</Trans>,
})

export const getImageDeleteErrorToast = (
  imageId: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Delete Image</Trans>,
  description: (
    <Trans>
      The image "{imageId}" could not be deleted: {errorMessage}
    </Trans>
  ),
})

export const getImageActivatedToast = (imageName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Instance</Trans>,
  description: <Trans>Image instance "{imageName}" has been activated</Trans>,
})

export const getImageDeactivatedToast = (imageName: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Instance</Trans>,
  description: <Trans>Image instance "{imageName}" has been deactivated</Trans>,
})

export const getImageActivationErrorToast = (
  imageId: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Re-activate Image</Trans>,
  description: (
    <Trans>
      The image "{imageId}" could not be re-activated: {errorMessage}
    </Trans>
  ),
})

export const getImageDeactivationErrorToast = (
  imageId: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Deactivate Image</Trans>,
  description: (
    <Trans>
      The image "{imageId}" could not be deactivated: {errorMessage}
    </Trans>
  ),
})

// ── Bulk operations ─────────────────────────────────────────────────────────

export const getBulkDeleteSuccessToast = (
  successCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Images Deleted</Trans>,
  description: (
    <Trans>
      Successfully deleted {successCount} of {totalCount} image(s)
    </Trans>
  ),
})

export const getBulkDeleteErrorToast = (
  failedCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Delete Images</Trans>,
  description: (
    <Trans>
      Failed to delete {failedCount} of {totalCount} image(s). Some images may be protected or in use.
    </Trans>
  ),
})

export const getBulkDeletePartialToast = (
  successCount: number,
  failedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Partial Delete Success</Trans>,
  description: (
    <Trans>
      Deleted {successCount} image(s), but {failedCount} image(s) could not be deleted.
    </Trans>
  ),
})

export const getBulkActivateSuccessToast = (
  successCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Images Activated</Trans>,
  description: (
    <Trans>
      Successfully activated {successCount} of {totalCount} image(s)
    </Trans>
  ),
})

export const getBulkActivateErrorToast = (
  failedCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Activate Images</Trans>,
  description: (
    <Trans>
      Failed to activate {failedCount} of {totalCount} image(s). Some images may already be active or in an invalid
      state.
    </Trans>
  ),
})

export const getBulkActivatePartialToast = (
  successCount: number,
  failedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Partial Activation Success</Trans>,
  description: (
    <Trans>
      Activated {successCount} image(s), but {failedCount} image(s) could not be activated.
    </Trans>
  ),
})

export const getBulkDeactivateSuccessToast = (
  successCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Images Deactivated</Trans>,
  description: (
    <Trans>
      Successfully deactivated {successCount} of {totalCount} image(s)
    </Trans>
  ),
})

export const getBulkDeactivateErrorToast = (
  failedCount: number,
  totalCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Failed to Deactivate Images</Trans>,
  description: (
    <Trans>
      Failed to deactivate {failedCount} of {totalCount} image(s). Some images may already be deactivated or in an
      invalid state.
    </Trans>
  ),
})

export const getBulkDeactivatePartialToast = (
  successCount: number,
  failedCount: number
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Partial Deactivation Success</Trans>,
  description: (
    <Trans>
      Deactivated {successCount} image(s), but {failedCount} image(s) could not be deactivated.
    </Trans>
  ),
})

// ── Image access ────────────────────────────────────────────────────────────

export const getImageAccessStatusUpdatedToast = (newStatus: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Access Status</Trans>,
  description: <Trans>Access status updated to "{newStatus}".</Trans>,
})

export const getImageAccessStatusErrorToast = (errorMessage: string): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Access Status</Trans>,
  description: errorMessage || <Trans>Failed to update access status</Trans>,
})

// ── Image visibility ────────────────────────────────────────────────────────

export const getImageVisibilityUpdatedToast = (
  imageName: string,
  visibility: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Image Visibility</Trans>,
  description: (
    <Trans>
      Image "{imageName}" visibility updated to {visibility}
    </Trans>
  ),
})

export const getImageVisibilityUpdateErrorToast = (
  imageName: string,
  errorMessage: string
): { message: ReactNode } & NotificationOptions => ({
  message: <Trans>Unable to Update Image Visibility</Trans>,
  description: (
    <Trans>
      Failed to update visibility for "{imageName}": {errorMessage}
    </Trans>
  ),
})

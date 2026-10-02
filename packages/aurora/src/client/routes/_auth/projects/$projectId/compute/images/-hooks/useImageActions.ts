import { GlanceImage, ImageMember } from "@/server/Compute/types/image"
import { IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../-constants/filters"

export interface ImageActionsInput {
  image: GlanceImage
  permissions: {
    canUpdate: boolean
    canDelete: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  myMemberData?: ImageMember | null
}

export interface ImageActions {
  // Derived state
  isSharedWithMe: boolean
  isOwnImage: boolean
  isPendingShared: boolean
  isAcceptedShared: boolean
  isDeactivated: boolean
  isPrivate: boolean
  isSharedVisibility: boolean
  isProtected: boolean

  // Action flags
  canViewDetails: boolean
  canEditDetails: boolean
  canEditMetadata: boolean
  canDelete: boolean
  canAccept: boolean
  canReject: boolean
  canManageAccess: boolean
  canSetToShared: boolean
  canActivate: boolean
  canDeactivate: boolean

  // Convenience
  hasAnyAction: boolean
}

/**
 * Centralized hook for determining what actions are available for an image
 * based on ownership, permissions, and member status.
 *
 * Eliminates duplicate permission logic across ImageTableRow, $imageId, and ImageListView.
 */
export function useImageActions({ image, permissions, myMemberData }: ImageActionsInput): ImageActions {
  // Derived state
  const isShared = image.visibility === IMAGE_VISIBILITY.SHARED
  const isSharedWithMe = isShared && !!myMemberData
  const isOwnImage = !isSharedWithMe
  const isPendingShared = isSharedWithMe && myMemberData?.status === "pending"
  const isAcceptedShared = isSharedWithMe && myMemberData?.status === "accepted"
  const isDeactivated = image.status === IMAGE_STATUSES.DEACTIVATED
  const isPrivate = image.visibility === IMAGE_VISIBILITY.PRIVATE
  const isSharedVisibility = image.visibility === IMAGE_VISIBILITY.SHARED
  const isProtected = !!image.protected

  // Action flags
  const canViewDetails = true // Always available if user can see the image
  const canEditDetails = isOwnImage && permissions.canUpdate
  const canEditMetadata = isOwnImage && permissions.canUpdate
  const canDelete = isOwnImage && permissions.canDelete && !isProtected
  const canAccept = isPendingShared && permissions.canUpdateMember
  const canReject = (isPendingShared || isAcceptedShared) && permissions.canUpdateMember
  const canManageAccess =
    isOwnImage && isSharedVisibility && (permissions.canCreateMember || permissions.canDeleteMember)
  const canSetToShared = isOwnImage && isPrivate && permissions.canUpdate
  const canActivate = isOwnImage && isDeactivated && permissions.canUpdate
  const canDeactivate = isOwnImage && !isDeactivated && permissions.canUpdate

  const hasAnyAction =
    canEditDetails ||
    canEditMetadata ||
    canDelete ||
    canAccept ||
    canReject ||
    canManageAccess ||
    canSetToShared ||
    canActivate ||
    canDeactivate

  return {
    // Derived state
    isSharedWithMe,
    isOwnImage,
    isPendingShared,
    isAcceptedShared,
    isDeactivated,
    isPrivate,
    isSharedVisibility,
    isProtected,

    // Action flags
    canViewDetails,
    canEditDetails,
    canEditMetadata,
    canDelete,
    canAccept,
    canReject,
    canManageAccess,
    canSetToShared,
    canActivate,
    canDeactivate,

    // Convenience
    hasAnyAction,
  }
}

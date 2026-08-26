import { useLingui } from "@lingui/react/macro"
import { Button, PopupMenu, PopupMenuItem, PopupMenuOptions, PopupMenuToggle } from "@cloudoperators/juno-ui-components"
import type { ModalType } from "./BucketModals"

interface BucketHeaderActionsProps {
  versioningStatus?: {
    status: "Enabled" | "Suspended" | "Unversioned"
  }
  hasPolicy: boolean
  hasOldVersionsOrDeleteMarkers: boolean
  isBucketEmpty: boolean
  onOpenModal: (modal: ModalType) => void
  canUpdateVersioning: boolean
  canUpdatePolicy: boolean
  canDeletePolicy: boolean
  canEmptyBucket: boolean
  canDeleteBucket: boolean
  canDeleteVersions: boolean
}

/**
 * Bucket header actions component
 *
 * Displays:
 * - Policy button (primary or subdued based on whether policy exists)
 * - Actions dropdown with versioning, policy, and bucket management options
 *
 * Every item in this menu is a gated mutation with no always-visible read action, so the
 * whole menu is hidden (not just its items) when nothing is available otherwise it would
 * render as an empty popup for a read-only user.
 */
export const BucketHeaderActions = ({
  versioningStatus,
  hasPolicy,
  hasOldVersionsOrDeleteMarkers,
  isBucketEmpty,
  onOpenModal,
  canUpdateVersioning,
  canUpdatePolicy,
  canDeletePolicy,
  canEmptyBucket,
  canDeleteBucket,
  canDeleteVersions,
}: BucketHeaderActionsProps) => {
  const { t } = useLingui()

  const canToggleVersioning =
    canUpdateVersioning &&
    Boolean(
      versioningStatus &&
      (versioningStatus.status === "Unversioned" ||
        versioningStatus.status === "Suspended" ||
        versioningStatus.status === "Enabled")
    )
  const canShowDeletePolicy = hasPolicy && canDeletePolicy
  const canShowEmptyBucket = !isBucketEmpty && canEmptyBucket
  const canShowDeleteVersions = hasOldVersionsOrDeleteMarkers && canDeleteVersions

  const hasAnyAction =
    canToggleVersioning ||
    canUpdatePolicy ||
    canShowDeletePolicy ||
    canShowEmptyBucket ||
    canShowDeleteVersions ||
    canDeleteBucket

  if (!hasAnyAction) {
    return null
  }

  return (
    <>
      <PopupMenu>
        <PopupMenuToggle as="div">
          <Button icon="moreVert" />
        </PopupMenuToggle>
        <PopupMenuOptions>
          {canUpdateVersioning &&
            versioningStatus &&
            (versioningStatus.status === "Unversioned" || versioningStatus.status === "Suspended") && (
              <PopupMenuItem label={t`Enable Versioning`} onClick={() => onOpenModal("enableVersioning")} />
            )}
          {canUpdateVersioning && versioningStatus && versioningStatus.status === "Enabled" && (
            <PopupMenuItem label={t`Suspend Versioning`} onClick={() => onOpenModal("suspendVersioning")} />
          )}
          {canUpdatePolicy && (
            <PopupMenuItem label={hasPolicy ? t`Edit Policy` : t`Add Policy`} onClick={() => onOpenModal("policy")} />
          )}
          {canShowDeletePolicy && (
            <PopupMenuItem label={t`Delete Policy`} onClick={() => onOpenModal("deletePolicy")} />
          )}
          {canShowEmptyBucket && <PopupMenuItem label={t`Empty Bucket`} onClick={() => onOpenModal("emptyBucket")} />}
          {canShowDeleteVersions && (
            <PopupMenuItem label={t`Delete Versions`} onClick={() => onOpenModal("deleteVersions")} />
          )}
          {canDeleteBucket && <PopupMenuItem label={t`Delete Bucket`} onClick={() => onOpenModal("deleteBucket")} />}
        </PopupMenuOptions>
      </PopupMenu>
    </>
  )
}

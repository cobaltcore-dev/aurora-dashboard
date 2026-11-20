import { useLingui } from "@lingui/react/macro"
import { Button, PopupMenu, PopupMenuItem, PopupMenuOptions, PopupMenuToggle } from "@cloudoperators/juno-ui-components"
import type { ModalType } from "./BucketModals"

interface BucketHeaderActionsProps {
  versioningStatus?: {
    status: "Enabled" | "Suspended" | "Unversioned"
  }
  hasPolicy: boolean
  hasOldVersionsOrDeleteMarkers: boolean
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
 * The menu always renders: "CLI Setup" is ungated, read-only info. Every other item is a gated
 * mutation and only appears when its permission is granted.
 */
export const BucketHeaderActions = ({
  versioningStatus,
  hasPolicy,
  hasOldVersionsOrDeleteMarkers,
  onOpenModal,
  canUpdateVersioning,
  canUpdatePolicy,
  canDeletePolicy,
  canEmptyBucket,
  canDeleteBucket,
  canDeleteVersions,
}: BucketHeaderActionsProps) => {
  const { t } = useLingui()

  const versioningState = canUpdateVersioning ? versioningStatus?.status : undefined
  const canEnableVersioning = versioningState === "Unversioned" || versioningState === "Suspended"
  const canSuspendVersioning = versioningState === "Enabled"
  const canShowDeletePolicy = hasPolicy && canDeletePolicy
  const canShowDeleteVersions = hasOldVersionsOrDeleteMarkers && canDeleteVersions

  return (
    <PopupMenu>
      <PopupMenuToggle as="div">
        <Button icon="moreVert" title={t`Bucket actions`} aria-label={t`Bucket actions`} />
      </PopupMenuToggle>
      <PopupMenuOptions>
        <PopupMenuItem
          label={t`CLI Setup`}
          onClick={() => onOpenModal("cliSetup")}
          data-testid="bucket-cli-setup-action"
        />
        {canEnableVersioning && (
          <PopupMenuItem label={t`Enable Versioning`} onClick={() => onOpenModal("enableVersioning")} />
        )}
        {canSuspendVersioning && (
          <PopupMenuItem label={t`Suspend Versioning`} onClick={() => onOpenModal("suspendVersioning")} />
        )}
        {canUpdatePolicy && (
          <PopupMenuItem label={hasPolicy ? t`Edit Policy` : t`Add Policy`} onClick={() => onOpenModal("policy")} />
        )}
        {canShowDeletePolicy && <PopupMenuItem label={t`Delete Policy`} onClick={() => onOpenModal("deletePolicy")} />}
        {canEmptyBucket && <PopupMenuItem label={t`Empty Bucket`} onClick={() => onOpenModal("emptyBucket")} />}
        {canShowDeleteVersions && (
          <PopupMenuItem label={t`Delete Versions`} onClick={() => onOpenModal("deleteVersions")} />
        )}
        {canDeleteBucket && <PopupMenuItem label={t`Delete Bucket`} onClick={() => onOpenModal("deleteBucket")} />}
      </PopupMenuOptions>
    </PopupMenu>
  )
}

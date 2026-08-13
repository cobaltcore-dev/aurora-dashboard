import { useLingui } from "@lingui/react/macro"
import { Button, PopupMenu, PopupMenuItem, PopupMenuOptions, PopupMenuToggle } from "@cloudoperators/juno-ui-components"
import type { ModalType } from "./BucketModals"

interface BucketHeaderActionsProps {
  versioningStatus?: {
    status: "Enabled" | "Suspended" | "Unversioned"
  }
  hasPolicy: boolean
  hasCors: boolean
  hasLifecycle: boolean
  hasOldVersionsOrDeleteMarkers: boolean
  isBucketEmpty: boolean
  onOpenModal: (modal: ModalType) => void
}

/**
 * Bucket header actions component
 *
 * Displays:
 * - Policy button (primary or subdued based on whether policy exists)
 * - Actions dropdown with versioning, policy, and bucket management options
 */
export const BucketHeaderActions = ({
  versioningStatus,
  hasPolicy,
  hasCors,
  hasLifecycle,
  hasOldVersionsOrDeleteMarkers,
  isBucketEmpty,
  onOpenModal,
}: BucketHeaderActionsProps) => {
  const { t } = useLingui()

  return (
    <>
      <PopupMenu>
        <PopupMenuToggle as="div">
          <Button icon="moreVert" />
        </PopupMenuToggle>
        <PopupMenuOptions>
          {versioningStatus &&
            (versioningStatus.status === "Unversioned" || versioningStatus.status === "Suspended") && (
              <PopupMenuItem label={t`Enable Versioning`} onClick={() => onOpenModal("enableVersioning")} />
            )}
          {versioningStatus && versioningStatus.status === "Enabled" && (
            <PopupMenuItem label={t`Suspend Versioning`} onClick={() => onOpenModal("suspendVersioning")} />
          )}
          <PopupMenuItem label={hasPolicy ? t`Edit Policy` : t`Add Policy`} onClick={() => onOpenModal("policy")} />
          {hasPolicy && <PopupMenuItem label={t`Delete Policy`} onClick={() => onOpenModal("deletePolicy")} />}
          {hasCors && <PopupMenuItem label={t`Delete CORS Rules`} onClick={() => onOpenModal("deleteCors")} />}
          <PopupMenuItem
            label={hasLifecycle ? t`Lifecycle Rules` : t`Add Lifecycle Rules`}
            onClick={() => onOpenModal("lifecycle")}
          />
          {hasLifecycle && (
            <PopupMenuItem label={t`Delete Lifecycle Rules`} onClick={() => onOpenModal("deleteLifecycle")} />
          )}
          {!isBucketEmpty && <PopupMenuItem label={t`Empty Bucket`} onClick={() => onOpenModal("emptyBucket")} />}
          {hasOldVersionsOrDeleteMarkers && (
            <PopupMenuItem label={t`Delete Versions`} onClick={() => onOpenModal("deleteVersions")} />
          )}
          <PopupMenuItem label={t`Delete Bucket`} onClick={() => onOpenModal("deleteBucket")} />
        </PopupMenuOptions>
      </PopupMenu>
    </>
  )
}

import { Trans, useLingui } from "@lingui/react/macro"
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
  hasOldVersionsOrDeleteMarkers,
  isBucketEmpty,
  onOpenModal,
}: BucketHeaderActionsProps) => {
  const { t } = useLingui()

  return (
    <>
      <Button variant="subdued" className="whitespace-nowrap" onClick={() => onOpenModal("policy")}>
        {hasPolicy ? <Trans>Edit/View Policy</Trans> : <Trans>Add Policy</Trans>}
      </Button>
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
          {hasPolicy && <PopupMenuItem label={t`Delete Policy`} onClick={() => onOpenModal("deletePolicy")} />}
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

import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { useParams } from "@tanstack/react-router"
import { Badge } from "@cloudoperators/juno-ui-components"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { useBucketInfo } from "../hooks/useBucketInfo"
import { BucketHeaderActions } from "./BucketHeaderActions"
import { BucketModals, type ModalType } from "./BucketModals"
import { decodePrefix } from "../../utils/prefixEncoding"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"

interface BucketHeaderProps {
  bucketName: string
}

/**
 * Bucket header component with badges, actions, and modals
 *
 * Displays:
 * - Bucket name as title
 * - Badges for versioning status and policy (only at root level)
 * - Action buttons (only at root level)
 * - All bucket management modals
 *
 * Actions are only shown at the root folder level to avoid confusion.
 */
export const BucketHeader = ({ bucketName }: BucketHeaderProps) => {
  const { projectId, provider, storageType } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })

  const { prefix: encodedPrefix } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)
  const isAtRoot = !currentPrefix || currentPrefix === ""

  const [activeModal, setActiveModal] = useState<ModalType | null>(null)

  // Fetch bucket information
  const { versioningStatus, policyData, isBucketEmptyWithVersions } = useBucketInfo({
    bucketName,
    enabled: isAtRoot, // Only fetch when at root level
  })

  const openModal = (modal: ModalType) => setActiveModal(modal)
  const closeModal = () => setActiveModal(null)

  // Build badges (only show at root level)
  const badges = isAtRoot ? (
    <>
      {versioningStatus && versioningStatus.status === "Enabled" && (
        <Badge variant="success">
          <Trans>Versioning Enabled</Trans>
        </Badge>
      )}
      {versioningStatus && versioningStatus.status === "Suspended" && (
        <Badge variant="warning">
          <Trans>Versioning Suspended</Trans>
        </Badge>
      )}
      {policyData?.policy && (
        <Badge variant="info">
          <Trans>Policy</Trans>
        </Badge>
      )}
    </>
  ) : null

  // Build actions (only show at root level)
  const actions = isAtRoot ? (
    <BucketHeaderActions
      versioningStatus={versioningStatus}
      hasPolicy={Boolean(policyData?.policy)}
      isBucketEmptyWithVersions={isBucketEmptyWithVersions}
      onOpenModal={openModal}
    />
  ) : null

  return (
    <>
      <ContentHeader title={bucketName} projectId={projectId} badges={badges} actions={actions} />

      <BucketModals
        bucketName={bucketName}
        provider={provider}
        storageType={storageType}
        activeModal={activeModal}
        onClose={closeModal}
      />
    </>
  )
}

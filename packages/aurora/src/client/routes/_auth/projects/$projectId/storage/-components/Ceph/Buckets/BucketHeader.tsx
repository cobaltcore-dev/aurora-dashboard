import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { useParams } from "@tanstack/react-router"
import { Badge, Divider } from "@cloudoperators/juno-ui-components"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { useBucketInfo } from "../hooks/useBucketInfo"
import { BucketHeaderActions } from "./BucketHeaderActions"
import { BucketModals, type ModalType } from "./BucketModals"
import { BucketDetailTabs } from "./BucketDetailTabs"

interface BucketHeaderProps {
  bucketName: string
}

/**
 * Bucket header component with badges, actions, and modals
 *
 * Displays:
 * - Bucket name as title
 * - Badges for versioning status and policy
 * - Action buttons
 * - All bucket management modals
 */
export const BucketHeader = ({ bucketName }: BucketHeaderProps) => {
  const { projectId, provider, storageType } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })

  const [activeModal, setActiveModal] = useState<ModalType | null>(null)

  // Fetch bucket information
  const { versioningStatus, policyData, corsData, lifecycleData, hasOldVersionsOrDeleteMarkers, isBucketEmpty } =
    useBucketInfo({
      bucketName,
      enabled: true,
    })

  const openModal = (modal: ModalType) => setActiveModal(modal)
  const closeModal = () => setActiveModal(null)

  // Build badges
  const badges = (
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
          <Trans>Bucket Policy</Trans>
        </Badge>
      )}
    </>
  )

  // Build actions
  const actions = (
    <BucketHeaderActions
      versioningStatus={versioningStatus}
      hasPolicy={Boolean(policyData?.policy)}
      hasCors={Boolean(corsData?.corsRules && corsData.corsRules.length > 0)}
      hasLifecycle={Boolean(lifecycleData?.rules && lifecycleData.rules.length > 0)}
      hasOldVersionsOrDeleteMarkers={hasOldVersionsOrDeleteMarkers}
      isBucketEmpty={isBucketEmpty}
      onOpenModal={openModal}
    />
  )

  return (
    <>
      <ContentHeader title={bucketName} projectId={projectId} badges={badges} actions={actions} />

      <div className="-mt-4 mb-8">
        <BucketDetailTabs />
        <Divider />
      </div>

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

import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Stack, TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import type { Share } from "@/server/SharedFileSystem/types/share"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import {
  TwoColumnDescriptionList,
  type DetailListItem,
  EMPTY_VALUE,
} from "@/client/components/TwoColumnDescriptionList"
import { useSharedFileSystemPermissions } from "@/client/hooks/useSharedFileSystemPermissions"
import { SHARE_PROTOCOL_LABELS } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListFilters"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"
import { SharedFileSystemIdLink } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemIdLink"
import { ShareExportLocationsTable } from "./ShareExportLocationsTable"
import { ShareSnapshotsTable } from "./ShareSnapshotsTable"
import { ShareReplicasTable } from "./ShareReplicasTable"
import {
  DEFAULT_SHARE_DETAILS_TAB,
  getShareDetailsTabs,
  isShareDetailsTab,
  type ShareDetailsTab,
} from "./shareDetailUtils"

interface ShareDetailsViewProps {
  share: Share
  projectId: string
  activeTab: ShareDetailsTab
  onTabChange: (tab: ShareDetailsTab) => void
}

export function ShareDetailsView({ share, projectId, activeTab, onTabChange }: ShareDetailsViewProps) {
  const { t } = useLingui()
  const permissions = useSharedFileSystemPermissions(projectId)

  // All three queries start together on mount (user decision, as in the Network detail).
  // Replicas only load when has_replicas is true (the BFF pins microversion 2.65, so there is no version gate).
  const {
    data: exportLocations = [],
    isLoading: isLoadingExportLocations,
    error: exportLocationsError,
    refetch: refetchExportLocations,
  } = trpcReact.sharedFileSystem.getShareExportLocations.useQuery(
    { project_id: projectId, shareId: share.id },
    { enabled: permissions.canListExportLocations, retry: false }
  )

  const {
    data: snapshots = [],
    isLoading: isLoadingSnapshots,
    error: snapshotsError,
    refetch: refetchSnapshots,
  } = trpcReact.sharedFileSystem.listSnapshots.useQuery(
    { project_id: projectId, shareId: share.id },
    { enabled: permissions.canListSnapshots, retry: false }
  )

  const {
    data: replicas = [],
    isLoading: isLoadingReplicas,
    error: replicasError,
    refetch: refetchReplicas,
  } = trpcReact.sharedFileSystem.listReplicas.useQuery(
    { project_id: projectId, shareId: share.id },
    { enabled: share.has_replicas === true && permissions.canListReplicas, retry: false }
  )

  // Protocol label
  const protocolKey = share.share_proto?.toLowerCase() as keyof typeof SHARE_PROTOCOL_LABELS | undefined
  const protocolLabel =
    protocolKey && SHARE_PROTOCOL_LABELS[protocolKey]
      ? SHARE_PROTOCOL_LABELS[protocolKey]
      : share.share_proto || undefined

  // Share Type (name + UUID vertical stack, or one, or - -)
  const shareTypeValue = (() => {
    const name = share.share_type_name?.trim()
    const uuid = share.share_type?.trim()

    if (name && uuid) {
      return (
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          <span>{name}</span>
          <ClipboardText text={uuid} className="text-theme-light text-sm" />
        </Stack>
      )
    }
    if (name) return name
    if (uuid) return <ClipboardText text={uuid} />
    return undefined
  })()

  // Visibility
  const visibilityLabel = share.is_public === true ? t`Public` : share.is_public === false ? t`Private` : undefined

  // Dates
  const createdDate = parseManilaTimestamp(share.created_at)
  const updatedDate = parseManilaTimestamp(share.updated_at)

  const basicInfoItems: DetailListItem[] = [
    { label: t`Name`, value: share.name },
    { label: t`ID`, value: <ClipboardText text={share.id} /> },
    { label: t`Status`, value: <StatusLabel value={share.status} /> },
    { label: t`Size (GiB)`, value: share.size },
    { label: t`Protocol`, value: protocolLabel },
    { label: t`Share Type`, value: shareTypeValue },
    { label: t`Availability Zone`, value: share.availability_zone },
    { label: t`Visibility`, value: visibilityLabel },
    {
      label: t`Share Network`,
      value: share.share_network_id ? (
        <SharedFileSystemIdLink target="shareNetwork" id={share.share_network_id} projectId={projectId} />
      ) : undefined,
    },
    {
      label: t`Source Snapshot`,
      value: share.snapshot_id ? (
        <SharedFileSystemIdLink target="snapshot" id={share.snapshot_id} projectId={projectId} />
      ) : undefined,
    },
    { label: t`Share Group`, value: share.share_group_id ? <ClipboardText text={share.share_group_id} /> : undefined },
    { label: t`Description`, value: share.description },
    { label: t`Created`, value: createdDate?.toLocaleString() },
    { label: t`Updated`, value: updatedDate?.toLocaleString() },
  ]

  // Capabilities sub-section (only shown when at least one capability is present)
  const capabilityItems: DetailListItem[] = []
  if (share.snapshot_support != null) {
    capabilityItems.push({
      label: t`Snapshot Support`,
      value: share.snapshot_support ? t`Yes` : t`No`,
    })
  }
  if (share.create_share_from_snapshot_support != null) {
    capabilityItems.push({
      label: t`Create Share From Snapshot Support`,
      value: share.create_share_from_snapshot_support ? t`Yes` : t`No`,
    })
  }
  if (share.revert_to_snapshot_support != null) {
    capabilityItems.push({
      label: t`Revert to Snapshot Support`,
      value: share.revert_to_snapshot_support ? t`Yes` : t`No`,
    })
  }
  if (share.mount_snapshot_support != null) {
    capabilityItems.push({
      label: t`Mount Snapshot Support`,
      value: share.mount_snapshot_support ? t`Yes` : t`No`,
    })
  }
  if (share.replication_type != null) {
    capabilityItems.push({
      label: t`Replication Type`,
      value: share.replication_type,
    })
  }
  if (share.has_replicas != null) {
    capabilityItems.push({
      label: t`Has Replicas`,
      value: share.has_replicas ? t`Yes` : t`No`,
    })
  }

  // Metadata (always rendered, with - - when empty)
  const metadataEntries = Object.entries(share.metadata ?? {}).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  const metadataItems: DetailListItem[] = metadataEntries.map(([key, value]) => ({
    label: key,
    value,
  }))

  // Tabs
  const tabs = getShareDetailsTabs(share)
  const effectiveTab = tabs.includes(activeTab) ? activeTab : DEFAULT_SHARE_DETAILS_TAB

  const tabLabels: Record<ShareDetailsTab, string> = {
    "export-locations": t`Export Locations`,
    snapshots: t`Snapshots`,
    replicas: t`Replicas`,
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList items={basicInfoItems} />

      {capabilityItems.length > 0 && (
        <>
          <h2>{t`Capabilities`}</h2>
          <TwoColumnDescriptionList items={capabilityItems} />
        </>
      )}

      <h2>{t`Metadata`}</h2>
      {metadataItems.length > 0 ? <TwoColumnDescriptionList items={metadataItems} /> : <span>{EMPTY_VALUE}</span>}

      <Stack direction="vertical" gap="4">
        {/* TabBar keeps its own active item once a tab is clicked, so activeItem keeps it in sync with
            the URL. `active` only covers the first render, before activeItem is applied. */}
        <TabBar
          appearance="tabs"
          ariaLabel={t`Share detail sections`}
          activeItem={effectiveTab}
          onActiveItemChange={(value) => isShareDetailsTab(value) && onTabChange(value)}
        >
          {tabs.map((tab) => (
            <TabBarItem key={tab} label={tabLabels[tab]} value={tab} active={effectiveTab === tab} />
          ))}
        </TabBar>

        {effectiveTab === "export-locations" && (
          <ShareExportLocationsTable
            exportLocations={exportLocations}
            isLoading={isLoadingExportLocations}
            error={exportLocationsError}
            canList={permissions.canListExportLocations}
            onRetry={() => void refetchExportLocations()}
          />
        )}

        {effectiveTab === "snapshots" && (
          <ShareSnapshotsTable
            snapshots={snapshots}
            isLoading={isLoadingSnapshots}
            error={snapshotsError}
            canList={permissions.canListSnapshots}
            onRetry={() => void refetchSnapshots()}
          />
        )}

        {effectiveTab === "replicas" && (
          <ShareReplicasTable
            replicas={replicas}
            isLoading={isLoadingReplicas}
            error={replicasError}
            canList={permissions.canListReplicas}
            onRetry={() => void refetchReplicas()}
          />
        )}
      </Stack>
    </Stack>
  )
}

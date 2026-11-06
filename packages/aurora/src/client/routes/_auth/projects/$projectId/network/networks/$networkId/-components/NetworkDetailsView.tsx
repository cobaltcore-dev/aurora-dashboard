import { ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Stack, Status, TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"
import type { Network } from "@/server/Network/types/network"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import { NetworkSubnetsTable } from "./NetworkSubnetsTable"
import { NetworkSegmentationTab } from "./NetworkSegmentationTab"

/** Tabs of the network details view, in display order. The first one is the default. */
export const NETWORK_DETAILS_TABS = ["segmentation", "subnets", "ports", "routers"] as const

export type NetworkDetailsTab = (typeof NETWORK_DETAILS_TABS)[number]

export const DEFAULT_NETWORK_DETAILS_TAB: NetworkDetailsTab = "segmentation"

export const isNetworkDetailsTab = (value: unknown): value is NetworkDetailsTab =>
  NETWORK_DETAILS_TABS.includes(value as NetworkDetailsTab)

interface NetworkDetailsViewProps {
  network: Network
  /** Active tab, owned by the route's `tab` search param */
  activeTab: NetworkDetailsTab
  onTabChange: (tab: NetworkDetailsTab) => void
}

const formatDateTime = (value?: string): string | undefined => (value ? new Date(value).toLocaleString() : undefined)

export function NetworkDetailsView({ network, activeTab, onTabChange }: NetworkDetailsViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()

  const {
    data: subnets = [],
    isLoading: isLoadingSubnets,
    isError: isSubnetsError,
    error: subnetsError,
    refetch: refetchSubnets,
  } = trpcReact.network.networks.listSubnets.useQuery({ project_id: projectId, network_id: network.id })

  const yesNo = (value?: boolean | null): string | undefined =>
    value === undefined || value === null ? undefined : value ? t`Yes` : t`No`

  const enabledDisabled = (value?: boolean | null): string | undefined =>
    value === undefined || value === null ? undefined : value ? t`Enabled` : t`Disabled`

  const segmentCount =
    network["provider:network_type"] != null ||
    network["provider:physical_network"] != null ||
    network["provider:segmentation_id"] != null
      ? 1
      : 0

  const basicInfoItems: DetailListItem[] = [
    { label: t`Name`, value: network.name },
    { label: t`ID`, value: <ClipboardText text={network.id} /> },
    { label: t`Status`, value: network.status },
    { label: t`Admin State`, value: network.admin_state_up ? t`UP` : t`DOWN` },
    // E2: when shared, shows the owning project_id with copy affordance
    { label: t`Shared`, value: network.shared ? <ClipboardText text={network.project_id} /> : t`No` },
    { label: t`External`, value: yesNo(network["router:external"]) },
    { label: t`MTU`, value: network.mtu },
    { label: t`Port Security`, value: enabledDisabled(network.port_security_enabled) },
    { label: t`Subnet count`, value: network.subnets.length },
    { label: t`Segment count`, value: segmentCount },
    { label: t`Availability Zones`, value: network.availability_zones?.join(", ") },
    { label: t`Description`, value: network.description },
    { label: t`Tags`, value: network.tags?.join(", ") },
    { label: t`Created`, value: formatDateTime(network.created_at) },
    { label: t`Updated`, value: formatDateTime(network.updated_at) },
  ]

  const tabLabels: Record<NetworkDetailsTab, string> = {
    segmentation: t`Segmentation`,
    subnets: t`Subnets`,
    ports: t`Ports`,
    routers: t`Routers`,
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList items={basicInfoItems} />

      <Stack direction="vertical" gap="4">
        {/* TabNavigation keeps its own active item once a tab is clicked, so activeItem keeps it in sync with
            the URL. `active` only covers the first render, before activeItem is applied. */}
        <TabNavigation
          activeItem={activeTab}
          onActiveItemChange={(value: ReactNode) => isNetworkDetailsTab(value) && onTabChange(value)}
        >
          {NETWORK_DETAILS_TABS.map((tab) => (
            <TabNavigationItem key={tab} label={tabLabels[tab]} value={tab} active={activeTab === tab} />
          ))}
        </TabNavigation>

        {activeTab === "segmentation" && <NetworkSegmentationTab network={network} />}

        {activeTab === "subnets" && (
          <NetworkSubnetsTable
            subnets={subnets}
            isLoading={isLoadingSubnets}
            isError={isSubnetsError}
            error={subnetsError}
            onRetry={() => refetchSubnets()}
          />
        )}

        {/* Mount points for #1403 (Subnets is above), #1404 (Ports), and #1405 (Routers) */}
        {activeTab === "ports" && (
          <Status
            status="empty"
            title={t`No Port Data`}
            body={t`Port information will be available in an upcoming update.`}
            data-testid="ports-placeholder"
          />
        )}

        {activeTab === "routers" && (
          <Status
            status="empty"
            title={t`No Router Data`}
            body={t`Attached router information will be available in an upcoming update.`}
            data-testid="routers-placeholder"
          />
        )}
      </Stack>
    </Stack>
  )
}

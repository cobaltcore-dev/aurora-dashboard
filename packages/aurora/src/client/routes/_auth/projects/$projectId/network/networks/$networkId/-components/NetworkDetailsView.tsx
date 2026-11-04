import { Fragment, ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import type { Network } from "@/server/Network/types/network"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { NetworkSubnetsTable } from "./NetworkSubnetsTable"

/** Tabs of the network details view, in display order. The first one is the default. */
export const NETWORK_DETAILS_TABS = ["subnets"] as const

export type NetworkDetailsTab = (typeof NETWORK_DETAILS_TABS)[number]

export const DEFAULT_NETWORK_DETAILS_TAB: NetworkDetailsTab = "subnets"

export const isNetworkDetailsTab = (value: unknown): value is NetworkDetailsTab =>
  NETWORK_DETAILS_TABS.includes(value as NetworkDetailsTab)

interface NetworkDetailsViewProps {
  network: Network
  /** Active tab, owned by the route's `tab` search param */
  activeTab: NetworkDetailsTab
  onTabChange: (tab: NetworkDetailsTab) => void
}

interface DetailItem {
  label: string
  value: ReactNode
}

const DetailsList = ({ items, keyPrefix }: { items: DetailItem[]; keyPrefix: string }) => (
  <DescriptionList alignTerms="right">
    {items.map(({ label, value }, index) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        <DescriptionTerm>{label}</DescriptionTerm>
        <DescriptionDefinition>
          <div className="break-all">{value}</div>
        </DescriptionDefinition>
      </Fragment>
    ))}
  </DescriptionList>
)

const formatDateTime = (value?: string): string => (value ? new Date(value).toLocaleString() : "—")

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

  const yesNo = (value?: boolean | null): string =>
    value === undefined || value === null ? "—" : value ? t`Yes` : t`No`

  const enabledDisabled = (value?: boolean | null): string =>
    value === undefined || value === null ? "—" : value ? t`Enabled` : t`Disabled`

  const basicInfoItems: DetailItem[] = [
    { label: t`Name`, value: network.name || "—" },
    { label: t`ID`, value: <ClipboardText text={network.id} /> },
    { label: t`Project ID`, value: <ClipboardText text={network.project_id} /> },
    { label: t`Description`, value: network.description || "—" },
    { label: t`Status`, value: network.status },
    { label: t`Admin State`, value: network.admin_state_up ? t`UP` : t`DOWN` },
    { label: t`MTU`, value: network.mtu ?? "—" },
    { label: t`Shared`, value: yesNo(network.shared) },
    { label: t`External`, value: yesNo(network["router:external"]) },
    { label: t`Port Security`, value: enabledDisabled(network.port_security_enabled) },
    {
      label: t`Availability Zones`,
      value: network.availability_zones?.length ? network.availability_zones.join(", ") : "—",
    },
    { label: t`Tags`, value: network.tags?.length ? network.tags.join(", ") : "—" },
    { label: t`Created`, value: formatDateTime(network.created_at) },
    { label: t`Updated`, value: formatDateTime(network.updated_at) },
  ]

  const tabLabels: Record<NetworkDetailsTab, string> = {
    subnets: t`Subnets`,
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <DetailsList items={basicInfoItems} keyPrefix="basic" />

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

        {activeTab === "subnets" && (
          <NetworkSubnetsTable
            subnets={subnets}
            isLoading={isLoadingSubnets}
            isError={isSubnetsError}
            error={subnetsError}
            onRetry={() => refetchSubnets()}
          />
        )}
      </Stack>
    </Stack>
  )
}

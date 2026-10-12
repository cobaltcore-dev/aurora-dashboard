import { Fragment, ReactNode, useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Status,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"

type NetworkDetailsTab = "overview" | "subnets"

interface NetworkDetailsViewProps {
  network: NetworkListItem
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

const SUBNETS_COLUMN_COUNT = 5

function SubnetsTab({ networkId }: { networkId: string }) {
  const { t } = useLingui()
  const projectId = useProjectId()

  const {
    data: subnets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpcReact.network.networks.listSubnets.useQuery({ project_id: projectId, network_id: networkId })

  if (isLoading) {
    return <Status status="progress" title={t`Loading Subnets...`} />
  }

  if (isError) {
    return (
      <Status
        status="error"
        title={t`Failed to Load Subnets`}
        body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
        action={<button onClick={() => refetch()}>{t`Try Again`}</button>}
      />
    )
  }

  if (subnets.length === 0) {
    return <Status status="empty" title={t`No Subnets`} body={t`This network has no subnets.`} />
  }

  return (
    <DataGrid columns={SUBNETS_COLUMN_COUNT} cellVerticalAlignment="top">
      <DataGridRow>
        <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
        <DataGridHeadCell>{t`CIDR`}</DataGridHeadCell>
        <DataGridHeadCell>{t`IP Version`}</DataGridHeadCell>
        <DataGridHeadCell>{t`Gateway IP`}</DataGridHeadCell>
        <DataGridHeadCell>{t`DHCP`}</DataGridHeadCell>
      </DataGridRow>
      {subnets.map((subnet) => (
        <DataGridRow key={subnet.id}>
          <DataGridCell>
            <Stack direction="vertical" gap="0.5" className="min-w-0">
              <span className="break-all">{subnet.name || subnet.id}</span>
              {subnet.name && <span className="text-theme-light text-sm break-all">{subnet.id}</span>}
            </Stack>
          </DataGridCell>
          <DataGridCell>{subnet.cidr || "–"}</DataGridCell>
          <DataGridCell>{subnet.ip_version ? `IPv${subnet.ip_version}` : "–"}</DataGridCell>
          <DataGridCell>{subnet.gateway_ip || "–"}</DataGridCell>
          <DataGridCell>
            {subnet.enable_dhcp === undefined ? "–" : subnet.enable_dhcp ? t`Enabled` : t`Disabled`}
          </DataGridCell>
        </DataGridRow>
      ))}
    </DataGrid>
  )
}

export function NetworkDetailsView({ network }: NetworkDetailsViewProps) {
  const { t } = useLingui()
  const [activeTab, setActiveTab] = useState<NetworkDetailsTab>("overview")

  const overviewItems: DetailItem[] = [
    { label: t`Name`, value: network.name || "—" },
    { label: t`ID`, value: <ClipboardText text={network.id} /> },
    { label: t`Project ID`, value: <ClipboardText text={network.project_id} /> },
    { label: t`Description`, value: network.description || "—" },
    { label: t`Status`, value: network.status },
    { label: t`Admin State`, value: network.admin_state_up ? t`UP` : t`DOWN` },
    { label: t`Shared`, value: network.shared ? t`Yes` : t`No` },
    { label: t`External`, value: network.external ? t`Yes` : t`No` },
    { label: t`MTU`, value: network.mtu ?? "—" },
    {
      label: t`Port Security`,
      value:
        network.port_security_enabled === null || network.port_security_enabled === undefined
          ? "—"
          : network.port_security_enabled
            ? t`Enabled`
            : t`Disabled`,
    },
    { label: t`Subnets`, value: network.subnet_count },
    ...(network.tags && network.tags.length > 0 ? [{ label: t`Tags`, value: network.tags.join(", ") }] : []),
    ...(network.created_at ? [{ label: t`Created At`, value: String(network.created_at) }] : []),
    ...(network.updated_at ? [{ label: t`Updated At`, value: String(network.updated_at) }] : []),
  ]

  const tabs = [
    { label: t`Overview`, value: "overview" },
    { label: t`Subnets`, value: "subnets" },
  ]

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TabNavigation
        activeItem={activeTab}
        onActiveItemChange={(value: ReactNode) => setActiveTab(value as NetworkDetailsTab)}
      >
        {tabs.map((tab) => (
          <TabNavigationItem key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </TabNavigation>

      {activeTab === "overview" && <DetailsList items={overviewItems} keyPrefix="overview" />}
      {activeTab === "subnets" && <SubnetsTab networkId={network.id} />}
    </Stack>
  )
}

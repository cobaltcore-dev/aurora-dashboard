import { Fragment, ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Stack,
  ContentHeading,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Status,
} from "@cloudoperators/juno-ui-components"
import { NetworkDetails } from "@/server/Network/types/network"
import ClipboardText from "@/client/components/ClipboardText"

interface NetworkDetailsViewProps {
  network: NetworkDetails
}

interface DetailItem {
  label: string
  value: ReactNode
}

/** Empty-value placeholder (Juno house rule). */
const PLACEHOLDER = "- -"

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

export const NetworkDetailsView = ({ network }: NetworkDetailsViewProps) => {
  const { t } = useLingui()

  const basicInfoItems: DetailItem[] = [
    { label: t`ID`, value: <ClipboardText text={network.id} /> },
    { label: t`Name`, value: network.name || PLACEHOLDER },
    { label: t`Description`, value: network.description || PLACEHOLDER },
    { label: t`Status`, value: network.status },
    { label: t`Admin State`, value: network.admin_state_up ? t`Up` : t`Down` },
    { label: t`Shared`, value: network.shared ? t`Yes` : t`No` },
    { label: t`External`, value: network["router:external"] ? t`Yes` : t`No` },
    { label: t`MTU`, value: network.mtu != null ? network.mtu : PLACEHOLDER },
    {
      label: t`Port Security Enabled`,
      value: network.port_security_enabled == null ? PLACEHOLDER : network.port_security_enabled ? t`Yes` : t`No`,
    },
  ]

  const providerItems: DetailItem[] = [
    ...(network["provider:network_type"] != null
      ? [{ label: t`Network Type`, value: network["provider:network_type"] || PLACEHOLDER }]
      : []),
    ...(network["provider:physical_network"] != null
      ? [{ label: t`Physical Network`, value: network["provider:physical_network"] || PLACEHOLDER }]
      : []),
    ...(network["provider:segmentation_id"] != null
      ? [{ label: t`Segmentation ID`, value: network["provider:segmentation_id"] }]
      : []),
  ]

  const subnets = network.subnet_details ?? []

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      {/* Network Information Section */}
      <Stack direction="vertical" gap="2">
        <ContentHeading>{t`Network Information`}</ContentHeading>
        <DetailsList items={basicInfoItems} keyPrefix="basic" />
      </Stack>

      {/* Subnets Section */}
      <Stack direction="vertical" gap="2">
        <ContentHeading>{t`Subnets`}</ContentHeading>
        {subnets.length === 0 ? (
          <Status
            status="empty"
            title={t`No Subnets`}
            body={t`There are no subnets associated with this network.`}
          />
        ) : (
          <DataGrid columns={5}>
            <DataGridRow>
              <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
              <DataGridHeadCell>{t`CIDR`}</DataGridHeadCell>
              <DataGridHeadCell>{t`IP Version`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Gateway IP`}</DataGridHeadCell>
              <DataGridHeadCell>{t`DHCP`}</DataGridHeadCell>
            </DataGridRow>
            {subnets.map((subnet) => (
              <DataGridRow key={subnet.id}>
                <DataGridCell>{subnet.name || subnet.id}</DataGridCell>
                <DataGridCell>{subnet.cidr || PLACEHOLDER}</DataGridCell>
                <DataGridCell>{subnet.ip_version != null ? `IPv${subnet.ip_version}` : PLACEHOLDER}</DataGridCell>
                <DataGridCell>{subnet.gateway_ip || PLACEHOLDER}</DataGridCell>
                <DataGridCell>
                  {subnet.enable_dhcp == null ? PLACEHOLDER : subnet.enable_dhcp ? t`Enabled` : t`Disabled`}
                </DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </Stack>

      {/* Provider Network Section (if applicable) */}
      {providerItems.length > 0 && (
        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Provider Network`}</ContentHeading>
          <DetailsList items={providerItems} keyPrefix="provider" />
        </Stack>
      )}
    </Stack>
  )
}

import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Message,
} from "@cloudoperators/juno-ui-components"
import { NetworkDetails } from "@/server/Network/types/network"

interface NetworkDetailsViewProps {
  network: NetworkDetails
}

export const NetworkDetailsView = ({ network }: NetworkDetailsViewProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" gap="6">
      {/* Network Information Section */}
      <Stack direction="vertical" gap="2">
        <h2 className="text-lg font-semibold">{t`Network Information`}</h2>
        <DataGrid columns={2}>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`ID`}</DataGridCell>
            <DataGridCell>{network.id}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Name`}</DataGridCell>
            <DataGridCell>{network.name || t`N/A`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Description`}</DataGridCell>
            <DataGridCell>{network.description || t`N/A`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Status`}</DataGridCell>
            <DataGridCell>{network.status}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Admin State`}</DataGridCell>
            <DataGridCell>{network.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Shared`}</DataGridCell>
            <DataGridCell>{network.shared ? t`Yes` : t`No`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`External`}</DataGridCell>
            <DataGridCell>{network["router:external"] ? t`Yes` : t`No`}</DataGridCell>
          </DataGridRow>
          {network.mtu && (
            <DataGridRow>
              <DataGridCell className="font-semibold">{t`MTU`}</DataGridCell>
              <DataGridCell>{network.mtu}</DataGridCell>
            </DataGridRow>
          )}
          <DataGridRow>
            <DataGridCell className="font-semibold">{t`Port Security Enabled`}</DataGridCell>
            <DataGridCell>{network.port_security_enabled !== false ? t`Yes` : t`No`}</DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>

      {/* Subnets Section */}
      <Stack direction="vertical" gap="2">
        <h2 className="text-lg font-semibold">{t`Subnets`}</h2>
        {!network.subnet_details || network.subnet_details.length === 0 ? (
          <Message variant="info">
            <Trans>No subnets associated with this network</Trans>
          </Message>
        ) : (
          <DataGrid columns={5}>
            <DataGridRow>
              <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
              <DataGridHeadCell>{t`CIDR`}</DataGridHeadCell>
              <DataGridHeadCell>{t`IP Version`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Gateway IP`}</DataGridHeadCell>
              <DataGridHeadCell>{t`DHCP`}</DataGridHeadCell>
            </DataGridRow>
            {network.subnet_details.map((subnet) => (
              <DataGridRow key={subnet.id}>
                <DataGridCell>{subnet.name || subnet.id}</DataGridCell>
                <DataGridCell>{subnet.cidr || t`N/A`}</DataGridCell>
                <DataGridCell>{subnet.ip_version ? `IPv${subnet.ip_version}` : t`N/A`}</DataGridCell>
                <DataGridCell>{subnet.gateway_ip || t`N/A`}</DataGridCell>
                <DataGridCell>{subnet.enable_dhcp ? t`Enabled` : t`Disabled`}</DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        )}
      </Stack>

      {/* Provider Network Section (if applicable) */}
      {(network["provider:network_type"] ||
        network["provider:physical_network"] ||
        network["provider:segmentation_id"]) && (
        <Stack direction="vertical" gap="2">
          <h2 className="text-lg font-semibold">{t`Provider Network`}</h2>
          <DataGrid columns={2}>
            {network["provider:network_type"] && (
              <DataGridRow>
                <DataGridCell className="font-semibold">{t`Network Type`}</DataGridCell>
                <DataGridCell>{network["provider:network_type"]}</DataGridCell>
              </DataGridRow>
            )}
            {network["provider:physical_network"] && (
              <DataGridRow>
                <DataGridCell className="font-semibold">{t`Physical Network`}</DataGridCell>
                <DataGridCell>{network["provider:physical_network"]}</DataGridCell>
              </DataGridRow>
            )}
            {network["provider:segmentation_id"] && (
              <DataGridRow>
                <DataGridCell className="font-semibold">{t`Segmentation ID`}</DataGridCell>
                <DataGridCell>{network["provider:segmentation_id"]}</DataGridCell>
              </DataGridRow>
            )}
          </DataGrid>
        </Stack>
      )}
    </Stack>
  )
}

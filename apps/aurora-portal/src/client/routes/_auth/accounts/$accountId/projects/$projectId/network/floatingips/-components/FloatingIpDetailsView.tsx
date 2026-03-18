import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  ButtonRow,
  Button,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  ContentHeading,
} from "@cloudoperators/juno-ui-components/index"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { formatFloatingIpStatus } from "@/client/utils/formatFloatingIpStatus"

interface FloatingIpDetailsViewProps {
  floatingIp: FloatingIp
}

export const FloatingIpDetailsView = ({ floatingIp }: FloatingIpDetailsViewProps) => {
  const { t } = useLingui()

  return (
    <>
      <ContentHeading>IP: {floatingIp.floating_ip_address}</ContentHeading>
      <p className="text-theme-secondary mt-2 text-sm">
        <Trans>
          Full lifecycle management of Floating IPs, including attachment, port association/disassociation, DNS
          settings, and deletion
        </Trans>
      </p>

      <ButtonRow>
        <Button>Edit Description</Button>
        <Button>Attach</Button>
        <Button>Detach</Button>
        <Button>Release</Button>
      </ButtonRow>

      <Stack direction="vertical" gap="6" className="mt-6">
        {/* Basic Info  */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Basic Info</Trans>
          </ContentHeading>
          <DataGrid columns={2}>
            <DataGridRow>
              <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.id}</DataGridCell>
            </DataGridRow>

            {floatingIp.description && (
              <DataGridRow>
                <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
                <DataGridCell>{floatingIp.description}</DataGridCell>
              </DataGridRow>
            )}

            <DataGridRow>
              <DataGridHeadCell>{t`Project ID`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.project_id || `—`}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
              <DataGridCell>{formatFloatingIpStatus(floatingIp.status)}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`Created At`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.created_at || `—`}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`Updated At`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.updated_at || `—`}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`Tags`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.tags?.join(", ") || `—`}</DataGridCell>
            </DataGridRow>
          </DataGrid>
        </Stack>
        {/* Network & Routing  */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Network & Routing</Trans>
          </ContentHeading>
          <DataGrid columns={2}>
            <DataGridRow>
              <DataGridHeadCell>{t`Floating IP Address`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.floating_ip_address || `—`}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`Floating Network`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.floating_network_id || `—`}</DataGridCell>
            </DataGridRow>

            {floatingIp.fixed_ip_address && (
              <DataGridRow>
                <DataGridHeadCell>{t`Fixed IP Address`}</DataGridHeadCell>
                <DataGridCell>{floatingIp.fixed_ip_address}</DataGridCell>
              </DataGridRow>
            )}

            {floatingIp.port_details && (
              <>
                <DataGridRow>
                  <DataGridHeadCell>{t`Port Name`}</DataGridHeadCell>
                  <DataGridCell>{floatingIp.port_details.name}</DataGridCell>
                </DataGridRow>

                <DataGridRow>
                  <DataGridHeadCell>{t`MAC Address`}</DataGridHeadCell>
                  <DataGridCell>{floatingIp.port_details.mac_address}</DataGridCell>
                </DataGridRow>

                <DataGridRow>
                  <DataGridHeadCell>{t`Network ID`}</DataGridHeadCell>
                  <DataGridCell>{floatingIp.port_details.network_id}</DataGridCell>
                </DataGridRow>

                <DataGridRow>
                  <DataGridHeadCell>{t`Device Owner`}</DataGridHeadCell>
                  <DataGridCell>{floatingIp.port_details.device_owner}</DataGridCell>
                </DataGridRow>

                <DataGridRow>
                  <DataGridHeadCell>{t`Device ID`}</DataGridHeadCell>
                  <DataGridCell>{floatingIp.port_details.device_id}</DataGridCell>
                </DataGridRow>
              </>
            )}

            {floatingIp.router_id && (
              <DataGridRow>
                <DataGridHeadCell>{t`Router ID`}</DataGridHeadCell>
                <DataGridCell>{floatingIp.router_id}</DataGridCell>
              </DataGridRow>
            )}

            {floatingIp.port_id && (
              <DataGridRow>
                <DataGridHeadCell>{t`Port ID`}</DataGridHeadCell>
                <DataGridCell>{floatingIp.port_id}</DataGridCell>
              </DataGridRow>
            )}

            <DataGridRow>
              <DataGridHeadCell>{t`QoS Policy ID`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.qos_policy_id || `—`}</DataGridCell>
            </DataGridRow>

            {floatingIp.port_forwardings && (
              <DataGridRow>
                <DataGridHeadCell>{t`Port Forwarding`}</DataGridHeadCell>
                <DataGridCell>{floatingIp.port_forwardings.map((port) => port.id).join(", ")}</DataGridCell>
              </DataGridRow>
            )}
          </DataGrid>
        </Stack>
        {/* DNS */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>DNS</Trans>
          </ContentHeading>
          <DataGrid columns={2}>
            <DataGridRow>
              <DataGridHeadCell>{t`DNS Domain`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.dns_domain || `—`}</DataGridCell>
            </DataGridRow>

            <DataGridRow>
              <DataGridHeadCell>{t`DNS Name`}</DataGridHeadCell>
              <DataGridCell>{floatingIp.dns_name || `—`}</DataGridCell>
            </DataGridRow>
          </DataGrid>
        </Stack>
      </Stack>
    </>
  )
}

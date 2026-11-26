import { Link } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { DataGrid, DataGridCell, DataGridHeadCell, DataGridRow, Stack } from "@cloudoperators/juno-ui-components"
import type { RouterDetails } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { NameIdCell, NAME_ID_LINK_CLASS } from "@/client/components/NameIdCell"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"

type ExternalGateway = NonNullable<RouterDetails["external_gateway_info"]>

interface RouterExternalGatewayTableProps {
  gateway: ExternalGateway
}

/**
 * External gateway rendered as a single-row table (a router has at most one gateway),
 * mirroring the internal-networks table: Name / ID, the external fixed IPs stacked as
 * IP over subnet ID, and the SNAT state.
 */
export const RouterExternalGatewayTable = ({ gateway }: RouterExternalGatewayTableProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const columns = [t`Name / ID`, t`External Fixed IPs`, t`SNAT`]

  const fixedIps = gateway.external_fixed_ips ?? []

  return (
    <DataGrid columns={columns.length} data-testid="router-external-gateway-table">
      <DataGridRow>
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      <DataGridRow data-testid={`router-external-gateway-row-${gateway.network_id}`}>
        <DataGridCell>
          <NameIdCell
            name={gateway.network_name}
            id={gateway.network_id}
            renderLink={(text) => (
              <Link
                to="/projects/$projectId/network/networks/$networkId"
                params={{ projectId, networkId: gateway.network_id }}
                className={NAME_ID_LINK_CLASS}
              >
                {text}
              </Link>
            )}
          />
        </DataGridCell>
        <DataGridCell>
          {fixedIps.length > 0 ? (
            <Stack direction="vertical" gap="2">
              {fixedIps.map((fixedIp) => (
                <Stack
                  key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}
                  direction="vertical"
                  gap="0.5"
                  className="min-w-0"
                >
                  <span className="break-all">{fixedIp.ip_address}</span>
                  <ClipboardText text={fixedIp.subnet_id} className="text-theme-light text-sm" />
                </Stack>
              ))}
            </Stack>
          ) : (
            EMPTY_VALUE
          )}
        </DataGridCell>
        <DataGridCell>
          {gateway.enable_snat === undefined ? EMPTY_VALUE : gateway.enable_snat ? t`Enabled` : t`Disabled`}
        </DataGridCell>
      </DataGridRow>
    </DataGrid>
  )
}

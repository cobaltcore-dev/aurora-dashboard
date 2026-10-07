import { useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { RouterInterface } from "@/server/Network/types/router"

interface RouterInterfacesTableProps {
  interfaces: RouterInterface[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
}

/** Internal networks of a router: one row per interface port. */
export const RouterInterfacesTable = ({ interfaces, isLoading, isError, error }: RouterInterfacesTableProps) => {
  const { t } = useLingui()
  const columns = [t`Name`, t`Fixed IPs`, t`Type`, t`Admin State`]

  if (isLoading) {
    return <Status status="progress" title={t`Loading Internal Networks...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message || t`Failed to Load Internal Networks`} />
  }

  return (
    <DataGrid columns={columns.length} data-testid="router-interfaces-table">
      <DataGridRow>
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {interfaces.length > 0 ? (
        interfaces.map((routerInterface) => (
          <DataGridRow key={routerInterface.port_id} data-testid={`router-interface-row-${routerInterface.port_id}`}>
            <DataGridCell>
              <Stack direction="vertical" gap="0.5" className="min-w-0">
                <span className="break-all">{routerInterface.network_name || routerInterface.network_id}</span>
                {routerInterface.network_name && (
                  <span className="text-theme-light text-sm break-all">{routerInterface.network_id}</span>
                )}
              </Stack>
            </DataGridCell>
            <DataGridCell>
              {routerInterface.fixed_ips.length > 0 ? (
                <Stack direction="vertical" gap="0.5">
                  {routerInterface.fixed_ips.map((fixedIp) => (
                    <span key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}>{fixedIp.ip_address}</span>
                  ))}
                </Stack>
              ) : (
                "—"
              )}
            </DataGridCell>
            <DataGridCell>{routerInterface.device_owner}</DataGridCell>
            <DataGridCell>
              {routerInterface.admin_state_up === undefined ? "—" : routerInterface.admin_state_up ? t`UP` : t`DOWN`}
            </DataGridCell>
          </DataGridRow>
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={columns.length}>
            <Status
              status="empty"
              title={t`No Internal Networks`}
              body={t`This router has no interfaces attached to internal networks.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}

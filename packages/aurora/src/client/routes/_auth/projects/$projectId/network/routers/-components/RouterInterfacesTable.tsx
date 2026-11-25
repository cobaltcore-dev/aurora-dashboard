import { Trans, useLingui } from "@lingui/react/macro"
import { StatusLabel } from "@/client/components/StatusLabel"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { RouterInterface } from "@/server/Network/types/router"
import ClipboardText from "@/client/components/ClipboardText"

interface RouterInterfacesTableProps {
  interfaces: RouterInterface[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  /** Re-runs the interfaces query; shown as "Try Again" in the error state */
  onRetry?: () => void
}

/** Internal networks of a router: one row per interface port. */
export const RouterInterfacesTable = ({
  interfaces,
  isLoading,
  isError,
  error,
  onRetry,
}: RouterInterfacesTableProps) => {
  const { t } = useLingui()
  const columns = [t`Name`, t`Fixed IPs`, t`Type`, t`Admin State`]

  if (isLoading) {
    return <Status status="progress" title={t`Loading Internal Networks...`} />
  }

  if (isError) {
    return (
      <Status
        status="error"
        title={error?.message || t`Failed to Load Internal Networks`}
        action={
          onRetry && (
            <Button onClick={onRetry}>
              <Trans>Try Again</Trans>
            </Button>
          )
        }
      />
    )
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
                {routerInterface.network_name ? (
                  <>
                    <span className="break-all">{routerInterface.network_name}</span>
                    <ClipboardText
                      text={routerInterface.network_id}
                      className="text-theme-light text-sm"
                      iconVisible="hover"
                    />
                  </>
                ) : (
                  <ClipboardText text={routerInterface.network_id} iconVisible="hover" />
                )}
              </Stack>
            </DataGridCell>
            <DataGridCell>
              {routerInterface.fixed_ips.length > 0 ? (
                <Stack direction="vertical" gap="2">
                  {routerInterface.fixed_ips.map((fixedIp) => (
                    <Stack
                      key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}
                      direction="vertical"
                      gap="0.5"
                      className="min-w-0"
                    >
                      <span className="break-all">{fixedIp.ip_address}</span>
                      <ClipboardText
                        text={fixedIp.subnet_id}
                        className="text-theme-light text-sm"
                        iconVisible="hover"
                      />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                "—"
              )}
            </DataGridCell>
            <DataGridCell>{routerInterface.device_owner}</DataGridCell>
            <DataGridCell>
              {routerInterface.admin_state_up === undefined ? (
                "—"
              ) : (
                <StatusLabel value={routerInterface.admin_state_up ? t`UP` : t`DOWN`} />
              )}
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

import { Link } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { Port } from "@/server/Network/types/port"
import ClipboardText from "@/client/components/ClipboardText"

interface NetworkPortsTableProps {
  ports: Port[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  onRetry?: () => void
  projectId: string
  routersAvailable: boolean
}

export function NetworkPortsTable({
  ports,
  isLoading,
  isError,
  error,
  onRetry,
  projectId,
  routersAvailable,
}: NetworkPortsTableProps) {
  const { t } = useLingui()

  // Human-friendly device-owner labels (i18n); unrecognized owners fall back to the raw string.
  const deviceOwnerLabels: Record<string, string> = {
    "compute:nova": t`Instance`,
    "network:router_interface": t`Router interface`,
    "network:dhcp": t`DHCP agent`,
    "network:floatingip": t`Floating IP`,
  }
  const deviceOwnerLabel = (deviceOwner: string): string => deviceOwnerLabels[deviceOwner] ?? deviceOwner

  if (isLoading) {
    return <Status status="progress" title={t`Loading Ports...`} />
  }

  if (isError) {
    return (
      <Status
        status="error"
        title={error?.message || t`Failed to Load Ports`}
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

  const columns = [t`ID`, t`Status`, t`Admin State`, t`Fixed IPs`, t`MAC Address`, t`Device Owner`, t`Attached Device`]

  return (
    <DataGrid columns={columns.length} data-testid="network-ports-table">
      <DataGridRow>
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {ports.length > 0 ? (
        ports.map((port) => (
          <DataGridRow key={port.id} data-testid={`network-port-row-${port.id}`}>
            <DataGridCell>
              <ClipboardText text={port.id} truncateAt={13} />
            </DataGridCell>
            <DataGridCell>{port.status.charAt(0) + port.status.slice(1).toLowerCase()}</DataGridCell>
            <DataGridCell>{port.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
            <DataGridCell>
              {port.fixed_ips.length > 0 ? (
                <Stack direction="vertical" gap="0.5">
                  {port.fixed_ips.map((ip) => (
                    <span key={`${ip.ip_address}-${ip.subnet_id}`} className="break-all">
                      {ip.ip_address}
                      <span className="text-theme-light text-sm"> ({ip.subnet_id})</span>
                    </span>
                  ))}
                </Stack>
              ) : (
                "- -"
              )}
            </DataGridCell>
            <DataGridCell>{port.mac_address}</DataGridCell>
            <DataGridCell>{deviceOwnerLabel(port.device_owner)}</DataGridCell>
            <DataGridCell>
              {port.device_id ? (
                port.device_owner === "network:router_interface" && routersAvailable ? (
                  // Copy affordance sits beside the link, not inside the anchor (I12)
                  <Stack direction="horizontal" gap="1" className="min-w-0 items-center">
                    <Link
                      to="/projects/$projectId/network/routers/$routerId"
                      params={{ projectId, routerId: port.device_id }}
                      className="text-theme-link hover:text-theme-default"
                    >
                      {port.device_id.length > 13 ? `${port.device_id.slice(0, 13)}...` : port.device_id}
                    </Link>
                    <ClipboardText text={port.device_id} iconOnly />
                  </Stack>
                ) : (
                  <ClipboardText text={port.device_id} truncateAt={13} />
                )
              ) : (
                "- -"
              )}
            </DataGridCell>
          </DataGridRow>
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={columns.length}>
            <Status status="empty" title={t`No Ports`} body={t`This network has no ports.`} />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}

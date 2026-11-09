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
import { Link } from "@tanstack/react-router"
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

const DEVICE_OWNER_LABELS: Record<string, string> = {
  "compute:nova": "Instance",
  "network:router_interface": "Router interface",
  "network:dhcp": "DHCP agent",
  "network:floatingip": "Floating IP",
}

function deviceOwnerLabel(deviceOwner: string): string {
  return DEVICE_OWNER_LABELS[deviceOwner] ?? deviceOwner
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
            <DataGridCell>{port.status}</DataGridCell>
            <DataGridCell>{port.admin_state_up ? t`UP` : t`DOWN`}</DataGridCell>
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
                  <Link
                    to="/projects/$projectId/network/routers/$routerId"
                    params={{ projectId, routerId: port.device_id }}
                    className="text-theme-link hover:text-theme-default block truncate"
                  >
                    {port.device_id}
                  </Link>
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

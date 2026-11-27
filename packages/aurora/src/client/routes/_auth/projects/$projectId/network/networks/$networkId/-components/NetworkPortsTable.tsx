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
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { NameIdCell, NAME_ID_LINK_CLASS } from "@/client/components/NameIdCell"

interface NetworkPortsTableProps {
  ports: Port[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  onRetry?: () => void
}

export function NetworkPortsTable({ ports, isLoading, isError, error, onRetry }: NetworkPortsTableProps) {
  const { t } = useLingui()
  const projectId = useProjectId()

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

  const columns = [
    t`Status`,
    t`Name / ID`,
    t`Admin State`,
    t`Fixed IPs`,
    t`MAC Address`,
    t`Device Owner`,
    t`Attached Device`,
  ]

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
            <DataGridCell>{port.status.charAt(0) + port.status.slice(1).toLowerCase()}</DataGridCell>
            <DataGridCell>
              <NameIdCell
                name={port.name}
                id={port.id}
                renderLink={(text) => (
                  <Link
                    to="/projects/$projectId/network/ports/$portId"
                    params={{ projectId, portId: port.id }}
                    className={NAME_ID_LINK_CLASS}
                  >
                    {text}
                  </Link>
                )}
              />
            </DataGridCell>
            <DataGridCell>{port.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
            <DataGridCell>
              {port.fixed_ips.length > 0 ? (
                <Stack direction="vertical" gap="2">
                  {port.fixed_ips.map((ip) => (
                    <Stack key={`${ip.ip_address}-${ip.subnet_id}`} direction="vertical" gap="0.5" className="min-w-0">
                      <span className="break-all">{ip.ip_address}</span>
                      <ClipboardText text={ip.subnet_id} className="text-theme-light text-sm" />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                "- -"
              )}
            </DataGridCell>
            <DataGridCell>{port.mac_address}</DataGridCell>
            <DataGridCell>{deviceOwnerLabel(port.device_owner)}</DataGridCell>
            <DataGridCell>{port.device_id ? <ClipboardText text={port.device_id} /> : "- -"}</DataGridCell>
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

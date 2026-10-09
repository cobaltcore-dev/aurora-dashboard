import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { PortListItem } from "@/server/Network/types/port"
import { useProjectId } from "@/client/hooks"

interface PortTableRowProps {
  port: PortListItem
  /** Hidden in a list scoped to one network */
  showNetwork?: boolean
}

/** Primary value on top, optional secondary value below in a lighter color. */
const TwoLineCell = ({ primary, secondary }: { primary: string; secondary?: string }) => (
  <Stack direction="vertical" gap="0.5" className="min-w-0">
    <span className="break-all">{primary}</span>
    {secondary && <span className="text-theme-light text-sm break-all">{secondary}</span>}
  </Stack>
)

/**
 * Network and subnets show their names and fall back to the ID only when the name can't be resolved.
 * The device ID is shown below the device owner as specified for the ports list (devices have no name lookup).
 */
export const PortTableRow = ({ port, showNetwork = true }: PortTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/network/ports/$portId",
      params: { projectId, portId: port.id },
    })
  }

  return (
    <DataGridRow key={port.id} data-testid={`port-row-${port.id}`} onClick={navigateToDetailsPage}>
      <DataGridCell>
        <TwoLineCell primary={port.name || port.id} secondary={port.name ? port.id : undefined} />
      </DataGridCell>
      <DataGridCell>{port.description ? <span className="break-all">{port.description}</span> : "–"}</DataGridCell>
      {showNetwork && (
        <DataGridCell>
          <span className="break-all">{port.network_name || port.network_id}</span>
        </DataGridCell>
      )}
      <DataGridCell>
        {port.fixed_ips.length > 0 ? (
          <Stack direction="vertical" gap="1">
            {port.fixed_ips.map((fixedIp) => (
              <TwoLineCell
                key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}
                primary={fixedIp.ip_address}
                secondary={fixedIp.subnet_name || fixedIp.subnet_id}
              />
            ))}
          </Stack>
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>
        {port.device_owner || port.device_id ? (
          <TwoLineCell primary={port.device_owner || "–"} secondary={port.device_id || undefined} />
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>{port.status}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={navigateToDetailsPage} />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { PortListItem } from "@/server/Network/types/port"
import { useProjectId } from "@/client/hooks"

interface PortTableRowProps {
  port: PortListItem
  /** Hidden in a list scoped to one network */
  showNetwork?: boolean
}

/**
 * Col 1: status as plain text. Col 2: name (or ID as fallback).
 * Network shows its name and falls back to the ID only when the name can't be resolved.
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
      <DataGridCell>{port.status}</DataGridCell>
      <DataGridCell>
        <span className="break-all">{port.name || port.id}</span>
      </DataGridCell>
      <DataGridCell>{port.description ? <span className="break-all">{port.description}</span> : "- -"}</DataGridCell>
      {showNetwork && (
        <DataGridCell>
          <span className="break-all">{port.network_name || port.network_id}</span>
        </DataGridCell>
      )}
      <DataGridCell>
        {port.fixed_ips.length > 0 ? (
          <Stack direction="vertical" gap="2">
            {port.fixed_ips.map((fixedIp) => (
              <span key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`} className="break-all">
                {fixedIp.ip_address}
              </span>
            ))}
          </Stack>
        ) : (
          "- -"
        )}
      </DataGridCell>
      <DataGridCell>{port.device_owner ? <span className="break-all">{port.device_owner}</span> : "- -"}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuToggle as="div">
            <Button icon="moreVert" title={t`Port actions`} aria-label={t`Port actions`} className="!bg-transparent" />
          </PopupMenuToggle>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={navigateToDetailsPage} />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

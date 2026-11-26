import { useNavigate } from "@tanstack/react-router"
import { StatusLabel } from "@/client/components/StatusLabel"
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
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"

interface PortTableRowProps {
  port: PortListItem
  /** Hidden in a list scoped to one network */
  showNetwork?: boolean
}

/**
 * Col 1: status as plain text. Col 2: name with the ID shown beneath it as a copy affordance
 * (ID only when no name is resolvable). The Network column shows its name with the ID beneath,
 * or just the ID when the name can't be resolved. Fixed IPs stack the IP over its subnet ID.
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
        <StatusLabel value={port.status} />
      </DataGridCell>
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          <span className="break-all">{port.name || EMPTY_VALUE}</span>
          <ClipboardText text={port.id} className="text-theme-light text-sm" />
        </Stack>
      </DataGridCell>
      <DataGridCell>{port.description ? <span className="break-all">{port.description}</span> : "- -"}</DataGridCell>
      {showNetwork && (
        <DataGridCell>
          <Stack direction="vertical" gap="0.5" className="min-w-0">
            {port.network_name ? (
              <>
                <span className="break-all">{port.network_name}</span>
                <ClipboardText text={port.network_id} className="text-theme-light text-sm" />
              </>
            ) : (
              <ClipboardText text={port.network_id} />
            )}
          </Stack>
        </DataGridCell>
      )}
      <DataGridCell>
        {port.fixed_ips.length > 0 ? (
          <Stack direction="vertical" gap="2">
            {port.fixed_ips.map((fixedIp) => (
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

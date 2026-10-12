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
import type { NetworkListItem } from "@/server/Network/types/network"
import { useProjectId } from "@/client/hooks"

interface NetworkTableRowProps {
  network: NetworkListItem
}

/** Primary value on top, optional secondary value below in a lighter color. */
const TwoLineCell = ({ primary, secondary }: { primary: string; secondary?: string }) => (
  <Stack direction="vertical" gap="0.5" className="min-w-0">
    <span className="break-all">{primary}</span>
    {secondary && <span className="text-theme-light text-sm break-all">{secondary}</span>}
  </Stack>
)

export const NetworkTableRow = ({ network }: NetworkTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/network/networks/$networkId",
      params: { projectId, networkId: network.id },
    })
  }

  return (
    <DataGridRow key={network.id} data-testid={`network-row-${network.id}`} onClick={navigateToDetailsPage}>
      <DataGridCell>
        <TwoLineCell primary={network.name || network.id} secondary={network.name ? network.id : undefined} />
      </DataGridCell>
      <DataGridCell>{network.status}</DataGridCell>
      <DataGridCell>{network.shared ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>{network.mtu ?? "–"}</DataGridCell>
      <DataGridCell>{network.admin_state_up ? t`UP` : t`DOWN`}</DataGridCell>
      <DataGridCell>{network.subnet_count}</DataGridCell>
      <DataGridCell>
        {network.port_security_enabled === null || network.port_security_enabled === undefined
          ? "–"
          : network.port_security_enabled
            ? t`Enabled`
            : t`Disabled`}
      </DataGridCell>
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

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

/**
 * Only the network's own ID is shown in the list; subnet IDs are shown on the details page.
 * A subnet's ID is only used as a fallback when its name can't be resolved.
 */
export const NetworkTableRow = ({ network }: NetworkTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const external = network["router:external"]

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
      <DataGridCell>{network.admin_state_up ? t`UP` : t`DOWN`}</DataGridCell>
      <DataGridCell>
        {network.subnet_details.length > 0 ? (
          <Stack direction="vertical" gap="1">
            {network.subnet_details.map((subnet) => (
              <span key={subnet.id} className="break-all">
                {subnet.name || subnet.id}
              </span>
            ))}
          </Stack>
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>{network.shared ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>{external === undefined || external === null ? "–" : external ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>{network.mtu ?? "–"}</DataGridCell>
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

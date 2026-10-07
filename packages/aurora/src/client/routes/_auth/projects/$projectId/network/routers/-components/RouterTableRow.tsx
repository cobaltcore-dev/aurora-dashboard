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
import type { RouterListItem } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"

interface RouterTableRowProps {
  router: RouterListItem
}

/** Primary value on top, optional secondary value below in a lighter color. */
const TwoLineCell = ({ primary, secondary }: { primary: string; secondary?: string }) => (
  <Stack direction="vertical" gap="0.5" className="min-w-0">
    <span className="break-all">{primary}</span>
    {secondary && <span className="text-theme-light text-sm break-all">{secondary}</span>}
  </Stack>
)

/**
 * Only the router's own ID is shown in the list; IDs of related entities (networks, subnets) are shown
 * on the details page. A related entity's ID is only used as a fallback when its name can't be resolved.
 */
export const RouterTableRow = ({ router }: RouterTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const gateway = router.external_gateway_info

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/network/routers/$routerId",
      params: { projectId, routerId: router.id },
    })
  }

  return (
    <DataGridRow key={router.id} data-testid={`router-row-${router.id}`} onClick={navigateToDetailsPage}>
      <DataGridCell>
        <TwoLineCell primary={router.name || router.id} secondary={router.name ? router.id : undefined} />
      </DataGridCell>
      <DataGridCell>
        {gateway ? <span className="break-all">{gateway.network_name || gateway.network_id}</span> : "–"}
      </DataGridCell>
      <DataGridCell>
        {gateway?.external_fixed_ips && gateway.external_fixed_ips.length > 0 ? (
          <Stack direction="vertical" gap="1">
            {gateway.external_fixed_ips.map((fixedIp) => (
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
        {router.private_networks && router.private_networks.length > 0 ? (
          <Stack direction="vertical" gap="1">
            {router.private_networks.map((privateNetwork) => (
              <span key={privateNetwork.network_id} className="break-all">
                {privateNetwork.network_name || privateNetwork.network_id}
              </span>
            ))}
          </Stack>
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>{router.status}</DataGridCell>
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

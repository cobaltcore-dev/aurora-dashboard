import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import type { RouterListItem } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"

interface RouterTableRowProps {
  router: RouterListItem
  /** Name of the current project, shown for routers owned by it */
  currentProjectName?: string
}

/** Primary value on top, secondary (usually an ID) below in a lighter color. */
const TwoLineCell = ({ primary, secondary }: { primary: string; secondary?: string }) => (
  <div className="flex min-w-0 flex-col">
    <span className="break-all">{primary}</span>
    {secondary && <span className="text-theme-light text-sm break-all">{secondary}</span>}
  </div>
)

export const RouterTableRow = ({ router, currentProjectName }: RouterTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const gateway = router.external_gateway_info
  const projectName = router.project_id === projectId ? currentProjectName : undefined

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
        <TwoLineCell
          primary={projectName || router.project_id}
          secondary={projectName ? router.project_id : undefined}
        />
      </DataGridCell>
      <DataGridCell>
        {gateway ? (
          <TwoLineCell
            primary={gateway.network_name || gateway.network_id}
            secondary={gateway.network_name ? gateway.network_id : undefined}
          />
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>
        {gateway?.external_fixed_ips && gateway.external_fixed_ips.length > 0 ? (
          <div className="flex flex-col gap-1">
            {gateway.external_fixed_ips.map((fixedIp) => (
              <TwoLineCell
                key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}
                primary={fixedIp.ip_address}
                secondary={fixedIp.subnet_name || fixedIp.subnet_id}
              />
            ))}
          </div>
        ) : (
          "–"
        )}
      </DataGridCell>
      <DataGridCell>
        {router.private_networks && router.private_networks.length > 0 ? (
          <div className="flex flex-col gap-1">
            {router.private_networks.map((privateNetwork) => (
              <TwoLineCell
                key={privateNetwork.network_id}
                primary={privateNetwork.network_name || privateNetwork.network_id}
                secondary={privateNetwork.network_name ? privateNetwork.network_id : undefined}
              />
            ))}
          </div>
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

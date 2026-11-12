import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { FloatingIpActionModals } from "../-modals/FloatingIpActionModals"
import { StatusLabel } from "@/client/components/StatusLabel"

interface FloatingIpTableRowProps {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const { data: permissions } = trpcReact.network.canUser.useQuery(
    {
      project_id: projectId,
      permission: [
        "network:floatingips:update",
        "network:floatingips:disassociate",
        "network:floatingips:delete",
        "network:floatingips:associate",
      ],
    },
    {
      select: ([canUpdate, canDisassociate, canDelete, canAssociate]) => ({
        canUpdate,
        canDisassociate,
        canDelete,
        canAssociate,
      }),
    }
  )

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/network/floatingips/$floatingIpId",
      params: { projectId, floatingIpId: floatingIp.id },
    })
  }

  return (
    <DataGridRow key={floatingIp.id} data-testid={`floating-ip-row-${floatingIp.id}`} onClick={navigateToDetailsPage}>
      <DataGridCell>
        <StatusLabel value={floatingIp.status} />
      </DataGridCell>
      <DataGridCell>{floatingIp.floating_ip_address}</DataGridCell>
      <DataGridCell>{floatingIp.fixed_ip_address || "- -"}</DataGridCell>
      <DataGridCell>{floatingIp.floating_network_id}</DataGridCell>
      <DataGridCell>
        <div className="truncate">{floatingIp.description || "- -"}</div>
      </DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
        <FloatingIpActionModals floatingIp={floatingIp}>
          {({ toggleEditModal, toggleAttachModal, toggleDetachModal, toggleReleaseModal }) => (
            <PopupMenu>
              <PopupMenuOptions>
                <PopupMenuItem label={t`Show Details`} onClick={navigateToDetailsPage} />
                {permissions?.canUpdate && <PopupMenuItem label={t`Edit Description`} onClick={toggleEditModal} />}
                {permissions?.canAssociate && <PopupMenuItem label={t`Attach`} onClick={toggleAttachModal} />}
                {permissions?.canDisassociate && <PopupMenuItem label={t`Detach`} onClick={toggleDetachModal} />}
                {permissions?.canDelete && <PopupMenuItem label={t`Release`} onClick={toggleReleaseModal} />}
              </PopupMenuOptions>
            </PopupMenu>
          )}
        </FloatingIpActionModals>
      </DataGridCell>
    </DataGridRow>
  )
}

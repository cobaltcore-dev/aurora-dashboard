import { useNavigate, useParams } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { STATUS_CONFIG } from "./constants"
import { FloatingIpActionModals } from "../-modals/FloatingIpActionModals"

interface FloatingIpTableRowProps {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })

  const navigateToDetailsPage = () => {
    if (!accountId || !projectId) return

    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
      params: { accountId, projectId, floatingIpId: floatingIp.id },
    })
  }

  return (
    <DataGridRow key={floatingIp.id} data-testid={`floating-ip-row-${floatingIp.id}`}>
      <DataGridCell>
        <div className="flex items-center gap-2">
          {STATUS_CONFIG[floatingIp.status].icon}
          {STATUS_CONFIG[floatingIp.status].text}
        </div>
      </DataGridCell>
      <DataGridCell>{floatingIp.floating_ip_address}</DataGridCell>
      <DataGridCell>{floatingIp.fixed_ip_address || "—"}</DataGridCell>
      <DataGridCell>{floatingIp.floating_network_id}</DataGridCell>
      <DataGridCell>{floatingIp.description || "—"}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <FloatingIpActionModals floatingIp={floatingIp}>
          {({ toggleEditModal, toggleAttachModal, toggleDetachModal, toggleReleaseModal }) => (
            <PopupMenu>
              <PopupMenuOptions>
                <PopupMenuItem label={t`Preview`} onClick={navigateToDetailsPage} />
                <PopupMenuItem label={t`Edit Description`} onClick={toggleEditModal} />
                <PopupMenuItem label={t`Attach`} onClick={toggleAttachModal} />
                <PopupMenuItem label={t`Detach`} onClick={toggleDetachModal} />
                <PopupMenuItem label={t`Release`} onClick={toggleReleaseModal} />
              </PopupMenuOptions>
            </PopupMenu>
          )}
        </FloatingIpActionModals>
      </DataGridCell>
    </DataGridRow>
  )
}

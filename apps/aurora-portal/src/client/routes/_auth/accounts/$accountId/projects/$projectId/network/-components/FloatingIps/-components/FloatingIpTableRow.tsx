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

interface FloatingIpTableRow {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRow) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })

  const navigateToDetailsPage = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
      params: { accountId: accountId!, projectId: projectId!, floatingIpId: floatingIp.id },
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
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Preview`} onClick={navigateToDetailsPage} />
            <PopupMenuItem label={t`Edit Description`} disabled />
            <PopupMenuItem label={t`Attach`} disabled />
            <PopupMenuItem label={t`Detach`} disabled />
            <PopupMenuItem label={t`Release`} disabled />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

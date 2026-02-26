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

  return (
    <DataGridRow key={floatingIp.id} data-testid={`floating-ip-row-${floatingIp.id}`}>
      <DataGridCell>{STATUS_CONFIG[floatingIp.status].icon}</DataGridCell>
      <DataGridCell>{STATUS_CONFIG[floatingIp.status].text}</DataGridCell>
      <DataGridCell>{floatingIp.floating_ip_address}</DataGridCell>
      <DataGridCell>{floatingIp.fixed_ip_address || "—"}</DataGridCell>
      <DataGridCell>{floatingIp.floating_network_id}</DataGridCell>
      <DataGridCell>{floatingIp.description || "—"}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
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

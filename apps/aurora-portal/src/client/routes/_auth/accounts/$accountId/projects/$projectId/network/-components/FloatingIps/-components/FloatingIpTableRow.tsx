import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { CircleCheckIcon, InfoIcon, CircleXIcon } from "lucide-react"

const STATUS_MAP_TO_TEXT = {
  ACTIVE: "Active",
  DOWN: "Down",
  ERROR: "Error",
}

// TODO: Replace them when designers decide on icons
const STATUS_MAP_TO_ICON = {
  ACTIVE: <CircleCheckIcon size={16} color="green" />,
  DOWN: <InfoIcon size={16} color="red" />,
  ERROR: <CircleXIcon size={16} color="yellow" />,
}

interface FloatingIpTableRow {
  floatingIp: FloatingIp
}

export const FloatingIpTableRow = ({ floatingIp }: FloatingIpTableRow) => {
  const { t } = useLingui()

  return (
    <DataGridRow key={floatingIp.id} data-testid={`floating-ip-row-${floatingIp.id}`}>
      <DataGridCell>{STATUS_MAP_TO_ICON[floatingIp.status]}</DataGridCell>
      <DataGridCell>{STATUS_MAP_TO_TEXT[floatingIp.status]}</DataGridCell>
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

import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import { NameIdCell } from "@/client/components/NameIdCell"

interface NetworkTableRowProps {
  network: NetworkListItem
}

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
        <StatusLabel value={network.status} />
      </DataGridCell>
      {/* Name — always shown ("- -" when empty); ID beneath with a copy affordance (E2-adjacent, spec AC) */}
      <DataGridCell>
        <NameIdCell name={network.name} id={network.id} />
      </DataGridCell>
      <DataGridCell>{network.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
      {/* Subnet count — derived from subnets.length; no extra API call (spec AC) */}
      <DataGridCell>{network.subnets.length}</DataGridCell>
      {/* Shared — show owning project_id with copy when shared, "No" otherwise (E2) */}
      <DataGridCell>{network.shared ? <ClipboardText text={network.project_id} /> : t`No`}</DataGridCell>
      <DataGridCell>{external === undefined || external === null ? "- -" : external ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`View Details`} onClick={navigateToDetailsPage} />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

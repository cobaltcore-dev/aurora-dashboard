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
import ClipboardText from "@/client/components/ClipboardText"

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
      <DataGridCell>{network.status}</DataGridCell>
      {/* Name — ID shown beneath the name with a copy affordance (E2-adjacent, spec AC) */}
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          {network.name ? (
            <>
              <span className="break-all">{network.name}</span>
              <ClipboardText text={network.id} className="text-theme-light text-sm" truncateAt={13} />
            </>
          ) : (
            <ClipboardText text={network.id} truncateAt={13} />
          )}
        </Stack>
      </DataGridCell>
      <DataGridCell>{network.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
      {/* Subnet count — derived from subnets.length; no extra API call (spec AC) */}
      <DataGridCell>{network.subnets.length}</DataGridCell>
      {/* Shared — show owning project_id with copy when shared, "No" otherwise (E2) */}
      <DataGridCell>
        {network.shared ? <ClipboardText text={network.project_id} truncateAt={13} /> : t`No`}
      </DataGridCell>
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

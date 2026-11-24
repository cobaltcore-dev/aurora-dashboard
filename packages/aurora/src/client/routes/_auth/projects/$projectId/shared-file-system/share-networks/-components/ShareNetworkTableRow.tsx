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
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { getSubnetCount } from "./shareNetworkListUtils"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

interface ShareNetworkTableRowProps {
  shareNetwork: ShareNetwork
}

export const ShareNetworkTableRow = ({ shareNetwork }: ShareNetworkTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/shared-file-system/share-networks/$shareNetworkId",
      params: { projectId, shareNetworkId: shareNetwork.id },
    })
  }

  // Subnet Count
  const subnetCount = getSubnetCount(shareNetwork)
  const subnetCountLabel = subnetCount !== undefined ? String(subnetCount) : EMPTY_VALUE

  // Created
  const createdDate = parseManilaTimestamp(shareNetwork.created_at)
  const createdLabel = createdDate?.toLocaleString() ?? EMPTY_VALUE

  return (
    <DataGridRow data-testid={`share-network-row-${shareNetwork.id}`} onClick={navigateToDetailsPage}>
      {/* Name / ID */}
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          {shareNetwork.name ? (
            <>
              <span className="break-all">{shareNetwork.name}</span>
              <ClipboardText text={shareNetwork.id} className="text-theme-light text-sm" truncateAt={13} />
            </>
          ) : (
            <ClipboardText text={shareNetwork.id} truncateAt={13} />
          )}
        </Stack>
      </DataGridCell>

      {/* Subnet Count */}
      <DataGridCell>{subnetCountLabel}</DataGridCell>

      {/* Created */}
      <DataGridCell>{createdLabel}</DataGridCell>

      {/* Actions */}
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={(e) => {
                e.stopPropagation()
                navigateToDetailsPage()
              }}
            />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

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
import type { Share } from "@/server/SharedFileSystem/types/share"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { SHARE_PROTOCOL_LABELS } from "./shareListFilters"
import { getShareTypeLabel, parseManilaTimestamp } from "./shareListUtils"

interface ShareTableRowProps {
  share: Share
}

export const ShareTableRow = ({ share }: ShareTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/shared-file-system/$shareId",
      params: { projectId, shareId: share.id },
    })
  }

  // Protocol label
  const protocolKey = share.share_proto?.toLowerCase() as keyof typeof SHARE_PROTOCOL_LABELS | undefined
  const protocolLabel =
    protocolKey && SHARE_PROTOCOL_LABELS[protocolKey]
      ? SHARE_PROTOCOL_LABELS[protocolKey]
      : share.share_proto || EMPTY_VALUE

  // Visibility
  const visibilityLabel = share.is_public === true ? t`Public` : share.is_public === false ? t`Private` : EMPTY_VALUE

  // Share Type
  const shareTypeLabel = getShareTypeLabel(share)

  // Created
  const createdDate = parseManilaTimestamp(share.created_at)
  const createdLabel = createdDate?.toLocaleString() ?? EMPTY_VALUE

  return (
    <DataGridRow data-testid={`share-row-${share.id}`} onClick={navigateToDetailsPage}>
      {/* Status */}
      <DataGridCell>
        <StatusLabel value={share.status} />
      </DataGridCell>

      {/* Name / ID */}
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          {share.name ? (
            <>
              <span className="break-all">{share.name}</span>
              <ClipboardText text={share.id} className="text-theme-light text-sm" truncateAt={13} />
            </>
          ) : (
            <ClipboardText text={share.id} truncateAt={13} />
          )}
        </Stack>
      </DataGridCell>

      {/* Protocol */}
      <DataGridCell>{protocolLabel}</DataGridCell>

      {/* Size (GiB) */}
      <DataGridCell>{share.size ?? EMPTY_VALUE}</DataGridCell>

      {/* Share Type */}
      <DataGridCell>{shareTypeLabel ? <span className="break-all">{shareTypeLabel}</span> : EMPTY_VALUE}</DataGridCell>

      {/* Availability Zone */}
      <DataGridCell>{share.availability_zone || EMPTY_VALUE}</DataGridCell>

      {/* Visibility */}
      <DataGridCell>{visibilityLabel}</DataGridCell>

      {/* Share Network */}
      <DataGridCell>
        {share.share_network_id ? <span className="break-all">{share.share_network_id}</span> : EMPTY_VALUE}
      </DataGridCell>

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

import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { Link, useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { Volume } from "@/server/Volume/types/volume"
import type { VolumeSnapshot } from "@/server/Volume/types/snapshot"
import { StatusLabel } from "@/client/components/StatusLabel"
import ClipboardText from "@/client/components/ClipboardText"
import { formatCinderDate } from "../-utils/list"

export function ResourceTable({
  items,
  snapshots,
  projectId,
  canRead,
  compact = false,
  nameLinkOnly = false,
}: {
  items: (Volume | VolumeSnapshot)[]
  snapshots: boolean
  projectId: string
  canRead: boolean
  compact?: boolean
  /**
   * When true the row is not clickable and only the name links to the item's detail page.
   * Use this where the table lists a different resource than the page it lives on (a cross-link),
   * e.g. the "Snapshots of this volume" subtable on the volume detail view.
   */
  nameLinkOnly?: boolean
}) {
  const { t, i18n } = useLingui()
  const navigate = useNavigate()
  const columns = compact ? 4 : snapshots ? 6 : 9
  const open = (id: string) => {
    if (!canRead) return
    if (snapshots)
      void navigate({ to: "/projects/$projectId/volumes/snapshots/$snapshotId", params: { projectId, snapshotId: id } })
    else void navigate({ to: "/projects/$projectId/volumes/$volumeId", params: { projectId, volumeId: id } })
  }
  return (
    <DataGrid
      columns={columns}
      minContentColumns={compact ? [] : [columns - 1]}
      data-testid={snapshots ? "snapshots-table" : "volumes-table"}
    >
      <DataGridRow>
        <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
        <DataGridHeadCell>{t`Name / ID`}</DataGridHeadCell>
        {!snapshots && <DataGridHeadCell>{t`Availability Zone`}</DataGridHeadCell>}
        <DataGridHeadCell>{t`Size (GiB)`}</DataGridHeadCell>
        {!snapshots && (
          <>
            <DataGridHeadCell>{t`Volume type`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Bootable`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Attached To`}</DataGridHeadCell>
          </>
        )}
        {snapshots && !compact && <DataGridHeadCell>{t`Source volume`}</DataGridHeadCell>}
        <DataGridHeadCell>{t`Created`}</DataGridHeadCell>
        {!compact && <DataGridHeadCell />}
      </DataGridRow>
      {items.map((item) => {
        const volume = item as Volume
        const hasName = Boolean(item.name?.trim())
        const name = hasName ? item.name : "- -"
        const attachments = volume.attachments?.filter((attachment) => attachment.server_id) ?? []
        const sourceVolumeId = (item as VolumeSnapshot).volume_id
        const detailLink = snapshots
          ? {
              to: "/projects/$projectId/volumes/snapshots/$snapshotId" as const,
              params: { projectId, snapshotId: item.id },
            }
          : { to: "/projects/$projectId/volumes/$volumeId" as const, params: { projectId, volumeId: item.id } }
        const rowIsClickable = canRead && !nameLinkOnly
        return (
          <DataGridRow
            key={item.id}
            data-testid={`storage-row-${item.id}`}
            onClick={rowIsClickable ? () => open(item.id) : undefined}
            tabIndex={rowIsClickable ? 0 : undefined}
            onKeyDown={(event) => {
              if (rowIsClickable && event.target === event.currentTarget && event.key === "Enter") open(item.id)
            }}
          >
            <DataGridCell>
              <StatusLabel value={item.status} />
            </DataGridCell>
            <DataGridCell textContain="break-word">
              <Stack direction="vertical" gap="0.5" className="min-w-0">
                {nameLinkOnly && canRead ? (
                  <Link
                    to={detailLink.to}
                    params={detailLink.params}
                    className="break-all text-inherit hover:underline"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="break-all">{name}</span>
                )}
                <ClipboardText text={item.id} className="text-theme-light text-sm" />
              </Stack>
            </DataGridCell>
            {!snapshots && <DataGridCell>{volume.availability_zone || "- -"}</DataGridCell>}
            <DataGridCell>{item.size ?? "- -"}</DataGridCell>
            {!snapshots && (
              <>
                <DataGridCell>{volume.volume_type || "- -"}</DataGridCell>
                <DataGridCell>{volume.bootable == null ? "- -" : volume.bootable ? t`Yes` : t`No`}</DataGridCell>
                <DataGridCell textContain="break-word">
                  {attachments.length
                    ? attachments.map((attachment, index) => (
                        <div className="inline-flex items-center" key={attachment.attachment_id || index}>
                          {index > 0 && ", "}
                          <ClipboardText text={attachment.server_id ?? ""} className="break-all whitespace-normal" />
                        </div>
                      ))
                    : "- -"}
                </DataGridCell>
              </>
            )}
            {snapshots && !compact && (
              <DataGridCell textContain="break-word">
                {sourceVolumeId ? (
                  <ClipboardText text={sourceVolumeId} className="break-all whitespace-normal" />
                ) : (
                  "- -"
                )}
              </DataGridCell>
            )}
            <DataGridCell>{formatCinderDate(item.created_at, i18n.locale)}</DataGridCell>
            {!compact && (
              <DataGridCell>
                {canRead && (
                  <PopupMenu onClick={(event) => event.stopPropagation()} aria-label={t`Actions for ${name}`}>
                    <PopupMenuOptions>
                      <PopupMenuItem
                        label={t`View details`}
                        onClick={(event) => {
                          event.stopPropagation()
                          open(item.id)
                        }}
                      />
                    </PopupMenuOptions>
                  </PopupMenu>
                )}
              </DataGridCell>
            )}
          </DataGridRow>
        )
      })}
    </DataGrid>
  )
}

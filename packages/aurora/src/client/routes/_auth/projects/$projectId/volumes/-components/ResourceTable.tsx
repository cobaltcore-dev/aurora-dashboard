import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
} from "@cloudoperators/juno-ui-components"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { Volume } from "@/server/Volume/types/volume"
import type { VolumeSnapshot } from "@/server/Volume/types/snapshot"
import { StatusLabel } from "@/client/components/StatusLabel"
import { SourceVolumeLink } from "./SourceVolumeLink"
import { ResourceLink } from "./ResourceLink"
import { formatCinderDate } from "../-utils/list"

export function ResourceTable({
  items,
  snapshots,
  projectId,
  canRead,
  compact = false,
}: {
  items: (Volume | VolumeSnapshot)[]
  snapshots: boolean
  projectId: string
  canRead: boolean
  compact?: boolean
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
        <DataGridHeadCell>{t`Name / ID`}</DataGridHeadCell>
        {snapshots ? (
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
        ) : (
          <DataGridHeadCell>{t`Availability Zone`}</DataGridHeadCell>
        )}
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
        {!snapshots && <DataGridHeadCell>{t`Status`}</DataGridHeadCell>}
        {!compact && <DataGridHeadCell />}
      </DataGridRow>
      {items.map((item) => {
        const volume = item as Volume
        const name = item.name?.trim() ? item.name : item.id
        const attachments = volume.attachments?.filter((attachment) => attachment.server_id) ?? []
        return (
          <DataGridRow
            key={item.id}
            data-testid={`storage-row-${item.id}`}
            onClick={canRead ? () => open(item.id) : undefined}
            tabIndex={canRead ? 0 : undefined}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && event.key === "Enter") open(item.id)
            }}
          >
            <DataGridCell textContain="break-word">
              {name}
              {name !== item.id && (
                <div className="text-theme-light text-sm break-all whitespace-normal">{item.id}</div>
              )}
            </DataGridCell>
            <DataGridCell>
              {snapshots ? <StatusLabel value={item.status} /> : volume.availability_zone || "- -"}
            </DataGridCell>
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
                          <ResourceLink resource="instance" id={attachment.server_id} />
                        </div>
                      ))
                    : "- -"}
                </DataGridCell>
              </>
            )}
            {snapshots && !compact && (
              <DataGridCell textContain="break-word">
                <SourceVolumeLink id={(item as VolumeSnapshot).volume_id} />
              </DataGridCell>
            )}
            <DataGridCell>{formatCinderDate(item.created_at, i18n.locale)}</DataGridCell>
            {!snapshots && (
              <DataGridCell>
                <StatusLabel value={item.status} />
              </DataGridCell>
            )}
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

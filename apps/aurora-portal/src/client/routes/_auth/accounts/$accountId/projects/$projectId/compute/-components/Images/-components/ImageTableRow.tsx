import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Icon,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import { StatusBadge } from "./StatusBadge"
import { VisibilityBadge } from "./VisibilityBadge"
import { SizeDisplay } from "./SizeDisplay"

interface ImageTableRowProps {
  image: GlanceImage
  onEdit: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  onLaunch: (image: GlanceImage) => void
  onActivationStatusChange: (image: GlanceImage) => void
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
}

export function ImageTableRow({
  image,
  permissions,
  onEdit,
  onDelete,
  onLaunch,
  onActivationStatusChange,
}: ImageTableRowProps) {
  const { t } = useLingui()
  const { id, name, status, visibility, size, disk_format, os_type, os_distro, created_at } = image
  const imageName = name || t`Unnamed`

  return (
    <DataGridRow key={id} data-testid={`image-row-${id}`}>
      <DataGridCell>{imageName}</DataGridCell>
      <DataGridCell>
        <StatusBadge status={status} />
      </DataGridCell>
      <DataGridCell>
        <VisibilityBadge visibility={visibility} />
      </DataGridCell>
      <DataGridCell>
        <SizeDisplay size={size} />
      </DataGridCell>
      <DataGridCell>{disk_format || t`N/A`}</DataGridCell>
      <DataGridCell>
        {os_type ? (
          <div className="flex items-center space-x-2">
            <Icon icon={"info"} color="jn-text-theme-info" />
            <span>{os_type}</span>
            {os_distro && <span className="text-xs text-gray-400">({os_distro})</span>}
          </div>
        ) : (
          "N/A"
        )}
      </DataGridCell>
      <DataGridCell>{created_at ? new Date(created_at).toLocaleDateString() : "N/A"}</DataGridCell>

      <DataGridCell>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Launch`} onClick={() => onLaunch(image)} />
            <PopupMenuItem
              label={image.status === "deactivated" ? t`Re-activate` : t`Deactivate`}
              onClick={() => onActivationStatusChange(image)}
            />
            {permissions.canEdit && <PopupMenuItem icon="edit" label={t`Edit`} onClick={() => onEdit(image)} />}
            {permissions.canDelete && (
              <PopupMenuItem icon="deleteForever" label={t`Delete`} onClick={() => onDelete(image)} />
            )}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

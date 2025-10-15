import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
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
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
}

export function ImageTableRow({ image, permissions, onEdit, onDelete }: ImageTableRowProps) {
  const { t } = useLingui()

  return (
    <DataGridRow key={image.id} data-testid={`image-row-${image.id}`}>
      <DataGridCell>{image.name || t`Unnamed`}</DataGridCell>
      <DataGridCell>
        <StatusBadge status={image.status} />
      </DataGridCell>
      <DataGridCell>
        <VisibilityBadge visibility={image.visibility} />
      </DataGridCell>
      <DataGridCell>
        <SizeDisplay size={image.size} />
      </DataGridCell>
      <DataGridCell>{image.disk_format || t`N/A`}</DataGridCell>
      <DataGridCell>
        {image.os_type ? (
          <div className="flex items-center space-x-2">
            <Icon icon={"info"} color="jn-text-theme-info" />
            <span>{image.os_type}</span>
            {image.os_distro && <span className="text-xs text-gray-400">({image.os_distro})</span>}
          </div>
        ) : (
          "N/A"
        )}
      </DataGridCell>
      <DataGridCell>{image.created_at ? new Date(image.created_at).toLocaleDateString() : "N/A"}</DataGridCell>

      <DataGridCell>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Launch`}
              onClick={() => {
                const toastProps: Omit<ToastProps, "id"> = {
                  title: t`Launch Instance`,
                  description: t`Launching instance from image "${image.name || t`Unnamed`}"`,
                  variant: "success",
                  button: {
                    label: t`Dismiss`,
                    onClick: () => sonnerToast.dismiss(),
                  },
                }
                auroraToast(toastProps)
              }}
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

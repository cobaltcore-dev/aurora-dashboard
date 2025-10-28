import { Link, useParams, useNavigate } from "@tanstack/react-router"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
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
  onActivationStatusChange: (image: GlanceImage) => void
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
}

export function ImageTableRow({ image, permissions, onEdit, onDelete, onActivationStatusChange }: ImageTableRowProps) {
  const { t } = useLingui()
  const { id, name, status, visibility, size, disk_format, created_at } = image
  const imageName = name || t`Unnamed`

  const { accountId, projectId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
  })
  const navigate = useNavigate()

  return (
    <DataGridRow key={id} data-testid={`image-row-${id}`}>
      <DataGridCell>
        <Link
          to="/accounts/$accountId/projects/$projectId/compute/images/$imageId"
          params={{ projectId, accountId, imageId: id }}
          className="text-theme-default hover:text-theme-link"
        >
          {imageName}
        </Link>
      </DataGridCell>
      <DataGridCell>
        <StatusBadge status={status} />
      </DataGridCell>
      <DataGridCell>
        <VisibilityBadge visibility={visibility} />
      </DataGridCell>
      <DataGridCell>{image.protected ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>
        <SizeDisplay size={size} />
      </DataGridCell>
      <DataGridCell>{disk_format || t`N/A`}</DataGridCell>
      <DataGridCell>{created_at ? new Date(created_at).toLocaleDateString() : t`N/A`}</DataGridCell>

      <DataGridCell>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={() =>
                navigate({
                  to: "/accounts/$accountId/projects/$projectId/compute/images/$imageId",
                  params: { accountId, projectId, imageId: id },
                })
              }
            />
            {permissions.canEdit && (
              <PopupMenuItem
                label={image.status === "deactivated" ? t`Re-activate` : t`Deactivate`}
                onClick={() => onActivationStatusChange(image)}
              />
            )}
            {permissions.canEdit && <PopupMenuItem label={t`Edit`} onClick={() => onEdit(image)} />}
            {permissions.canDelete && !image.protected && (
              <PopupMenuItem label={t`Delete`} onClick={() => onDelete(image)} />
            )}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

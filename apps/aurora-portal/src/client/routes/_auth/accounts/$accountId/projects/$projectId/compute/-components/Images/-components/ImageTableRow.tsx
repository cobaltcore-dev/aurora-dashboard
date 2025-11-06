import { Link, useParams, useNavigate } from "@tanstack/react-router"
import {
  Checkbox,
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"

interface ImageTableRowProps {
  image: GlanceImage
  isSelected: boolean
  onEditDetails: (image: GlanceImage) => void
  onEditMetadata: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  onSelect: (image: GlanceImage) => void
  onActivationStatusChange: (image: GlanceImage) => void
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
}

export function ImageTableRow({
  image,
  isSelected,
  permissions,
  onEditDetails,
  onEditMetadata,
  onDelete,
  onSelect,
  onActivationStatusChange,
}: ImageTableRowProps) {
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
        <Checkbox checked={isSelected} onChange={() => onSelect(image)} />
      </DataGridCell>
      <DataGridCell>
        <Link
          to="/accounts/$accountId/projects/$projectId/compute/images/$imageId"
          params={{ projectId, accountId, imageId: id }}
          className="text-theme-default hover:text-theme-link"
        >
          {imageName}
        </Link>
      </DataGridCell>
      <DataGridCell>{status}</DataGridCell>
      <DataGridCell>{visibility}</DataGridCell>
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
              <>
                <PopupMenuItem label={t`Edit Details`} onClick={() => onEditDetails(image)} />
                <PopupMenuItem label={t`Edit Metadata`} onClick={() => onEditMetadata(image)} />
                <PopupMenuItem
                  label={image.status === "deactivated" ? t`Activate` : t`Deactivate`}
                  onClick={() => onActivationStatusChange(image)}
                />
              </>
            )}
            {permissions.canDelete && !image.protected && (
              <PopupMenuItem label={t`Delete`} onClick={() => onDelete(image)} />
            )}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

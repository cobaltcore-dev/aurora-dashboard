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
import { GlanceImage, ImageVisibility } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"
import { IMAGE_STATUSES, IMAGE_VISIBILITY } from "../../../-constants/filters"

interface ImageTableRowProps {
  image: GlanceImage
  isSelected: boolean
  onEditDetails: (image: GlanceImage) => void
  onEditMetadata: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  onSelect: (image: GlanceImage) => void
  onActivationStatusChange: (image: GlanceImage) => void
  onManageAccess: (image: GlanceImage) => void
  onConfirmAccess: (image: GlanceImage) => void
  onUpdateVisibility: (imageId: string, newVisibility: ImageVisibility, imageName: string) => Promise<void>
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  shouldShowSuggestedImages: boolean
  uploadId?: string | null
  uploadProgressPercent?: number
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
  onManageAccess,
  onConfirmAccess,
  onUpdateVisibility,
  shouldShowSuggestedImages,
  uploadId,
  uploadProgressPercent,
}: ImageTableRowProps) {
  const { t } = useLingui()
  const { id, name, status, visibility, size, disk_format, created_at, owner } = image
  const imageName = name || t`Unnamed`

  const { accountId, projectId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
  })
  const navigate = useNavigate()

  const isImageOwner = projectId === owner

  return (
    <DataGridRow key={id} data-testid={`image-row-${id}`}>
      <DataGridCell>
        <Checkbox checked={isSelected} onChange={() => onSelect(image)} />
      </DataGridCell>

      <DataGridCell>{status}</DataGridCell>
      <DataGridCell>
        <Link
          to="/accounts/$accountId/projects/$projectId/compute/images/$imageId"
          params={{ projectId, accountId, imageId: id }}
          className="text-theme-default hover:text-theme-link"
        >
          {imageName}
        </Link>
      </DataGridCell>
      <DataGridCell>{visibility}</DataGridCell>
      <DataGridCell>{image.protected ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>
        {uploadId && uploadId === id ? `${uploadProgressPercent}%` : <SizeDisplay size={size} />}
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
            {permissions.canUpdate && (
              <>
                <PopupMenuItem label={t`Edit Details`} onClick={() => onEditDetails(image)} />
                <PopupMenuItem label={t`Edit Metadata`} onClick={() => onEditMetadata(image)} />
                <PopupMenuItem
                  label={image.status === IMAGE_STATUSES.DEACTIVATED ? t`Activate` : t`Deactivate`}
                  onClick={() => onActivationStatusChange(image)}
                />
                {image.visibility === IMAGE_VISIBILITY.SHARED && (
                  <>
                    {isImageOwner && (permissions.canCreateMember || permissions.canDeleteMember) && (
                      <PopupMenuItem label={t`Manage Access`} onClick={() => onManageAccess(image)} />
                    )}
                    {!isImageOwner && permissions.canUpdateMember && (
                      <PopupMenuItem
                        label={shouldShowSuggestedImages ? t`Confirm Access` : t`Review Access`}
                        onClick={() => onConfirmAccess(image)}
                      />
                    )}
                  </>
                )}
                {image.visibility === IMAGE_VISIBILITY.PRIVATE && (
                  <PopupMenuItem
                    label={t`Set to "Shared"`}
                    onClick={() => onUpdateVisibility(image.id, IMAGE_VISIBILITY.SHARED, imageName)}
                  />
                )}
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

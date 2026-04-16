import { useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import {
  Checkbox,
  DataGridCell,
  DataGridRow,
  Modal,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Spinner,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage, ImageVisibility, MemberStatus } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"
import { IMAGE_STATUSES, IMAGE_VISIBILITY, MEMBER_STATUSES } from "../../../-constants/filters"
import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { getImageAccessStatusUpdatedToast, getImageAccessStatusErrorToast } from "./ImageToastNotifications"

interface ImageTableRowProps {
  image: GlanceImage
  isPending: boolean
  isAccepted: boolean
  isSelected: boolean
  onEditDetails: (image: GlanceImage) => void
  onEditMetadata: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  onSelect: (image: GlanceImage) => void
  onActivationStatusChange: (image: GlanceImage) => void
  onManageAccess: (image: GlanceImage) => void
  onUpdateVisibility: (imageId: string, newVisibility: ImageVisibility, imageName: string) => Promise<void>
  setToastData: (toast: ToastProps | null) => void
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  uploadId?: string | null
  uploadProgressPercent?: number
}

export function ImageTableRow({
  image,
  isSelected,
  isPending,
  isAccepted,
  permissions,
  onEditDetails,
  onEditMetadata,
  onDelete,
  onSelect,
  onActivationStatusChange,
  onManageAccess,
  onUpdateVisibility,
  setToastData,
  uploadId,
  uploadProgressPercent,
}: ImageTableRowProps) {
  const { t } = useLingui()
  const { id, name, status, visibility, size, disk_format, created_at, owner } = image
  const imageName = name || t`Unnamed`

  const { accountId, projectId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/images/",
  })
  const navigate = useNavigate()

  const utils = trpcReact.useUtils()
  const updateMemberMutation = trpcReact.compute.updateImageMember.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      utils.compute.listSharedImagesByMemberStatus.invalidate()
    },
  })

  const handleMemberStatusChange = async (newStatus: MemberStatus) => {
    try {
      await updateMemberMutation.mutateAsync({ imageId: id, memberId: projectId, status: newStatus })
      setToastData(getImageAccessStatusUpdatedToast(newStatus, { onDismiss: () => setToastData(null) }))
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message
      setToastData(getImageAccessStatusErrorToast(errorMessage, { onDismiss: () => setToastData(null) }))
    }
  }

  const isImageOwner = projectId === owner
  const isExternalImage = isPending || isAccepted
  const isMutating = updateMemberMutation.isPending

  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

  return (
    <DataGridRow
      key={id}
      data-testid={`image-row-${id}`}
      onClick={() =>
        navigate({
          to: "/accounts/$accountId/projects/$projectId/compute/images/$imageId",
          params: { accountId, projectId, imageId: id },
        })
      }
    >
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onChange={() => onSelect(image)} />
      </DataGridCell>

      <DataGridCell>{status}</DataGridCell>
      <DataGridCell>{imageName}</DataGridCell>
      <DataGridCell>{visibility}</DataGridCell>
      <DataGridCell>{image.protected ? t`Yes` : t`No`}</DataGridCell>
      <DataGridCell>
        {uploadId && uploadId === id ? `${uploadProgressPercent}%` : <SizeDisplay size={size} />}
      </DataGridCell>
      <DataGridCell>{disk_format || t`N/A`}</DataGridCell>
      <DataGridCell>{created_at ? new Date(created_at).toLocaleDateString() : t`N/A`}</DataGridCell>

      <DataGridCell onClick={(e) => e.stopPropagation()}>
        {isMutating ? (
          <Spinner variant="primary" size="small" />
        ) : (
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

              {isExternalImage && permissions.canUpdateMember && (
                <>
                  {isPending && (
                    <PopupMenuItem
                      label={t`Accept`}
                      onClick={() => setAcceptModalOpen(true)}
                    />
                  )}
                  {isPending && (
                    <PopupMenuItem
                      label={t`Reject`}
                      onClick={() => setRejectModalOpen(true)}
                    />
                  )}
                  {isAccepted && (
                    <PopupMenuItem
                      label={t`Reject`}
                      onClick={() => setRejectModalOpen(true)}
                    />
                  )}
                </>
              )}

              {/* Own image: full actions */}
              {!isExternalImage && permissions.canUpdate && (
                <>
                  <PopupMenuItem label={t`Edit Details`} onClick={() => onEditDetails(image)} />
                  <PopupMenuItem label={t`Edit Metadata`} onClick={() => onEditMetadata(image)} />
                  <PopupMenuItem
                    label={image.status === IMAGE_STATUSES.DEACTIVATED ? t`Activate` : t`Deactivate`}
                    onClick={() => onActivationStatusChange(image)}
                  />
                  {image.visibility === IMAGE_VISIBILITY.SHARED &&
                    isImageOwner &&
                    (permissions.canCreateMember || permissions.canDeleteMember) && (
                      <PopupMenuItem label={t`Manage Access`} onClick={() => onManageAccess(image)} />
                    )}
                  {image.visibility === IMAGE_VISIBILITY.PRIVATE && (
                    <PopupMenuItem
                      label={t`Set to "Shared"`}
                      onClick={() => onUpdateVisibility(image.id, IMAGE_VISIBILITY.SHARED, imageName)}
                    />
                  )}
                </>
              )}
              {!isExternalImage && permissions.canDelete && !image.protected && (
                <PopupMenuItem label={t`Delete`} onClick={() => onDelete(image)} />
              )}
            </PopupMenuOptions>
          </PopupMenu>
        )}

        {acceptModalOpen && (
          <Modal
            title={t`Accept Shared Image`}
            open={acceptModalOpen}
            onCancel={() => setAcceptModalOpen(false)}
            confirmButtonLabel={t`Accept`}
            onConfirm={() => {
              setAcceptModalOpen(false)
              handleMemberStatusChange(MEMBER_STATUSES.ACCEPTED)
            }}
          >
            <p>
              {t`Accept access to image`} <strong>{imageName}</strong>?{" "}
              {t`It will appear in your image list.`}
            </p>
          </Modal>
        )}

        {rejectModalOpen && (
          <Modal
            title={t`Reject Shared Image`}
            open={rejectModalOpen}
            onCancel={() => setRejectModalOpen(false)}
            confirmButtonLabel={t`Reject`}
            onConfirm={() => {
              setRejectModalOpen(false)
              handleMemberStatusChange(MEMBER_STATUSES.REJECTED)
            }}
          >
            <p>
              {t`Reject access to image`} <strong>{imageName}</strong>?{" "}
              {t`It will be removed from your image list.`}
            </p>
          </Modal>
        )}
      </DataGridCell>
    </DataGridRow>
  )
}

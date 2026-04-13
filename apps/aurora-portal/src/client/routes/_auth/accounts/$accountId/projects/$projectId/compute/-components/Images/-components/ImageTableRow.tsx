import { useEffect, useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import {
  Button,
  Checkbox,
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Spinner,
  Stack,
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

  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  useEffect(() => {
    if (confirmRevoke) {
      const timer = setTimeout(() => setConfirmRevoke(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmRevoke])
  useEffect(() => {
    if (confirmReject) {
      const timer = setTimeout(() => setConfirmReject(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmReject])

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
        {isExternalImage ? (
          permissions.canUpdateMember ? (
            <Stack direction="horizontal" gap="2">
              {isMutating ? (
                <Spinner variant="primary" size="small" />
              ) : (
                <>
                  {isPending && (
                    <>
                      {confirmReject ? (
                        <Button
                          size="small"
                          variant="primary-danger"
                          label={t`Confirm`}
                          onClick={() => {
                            setConfirmReject(false)
                            handleMemberStatusChange(MEMBER_STATUSES.REJECTED)
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="subdued"
                          label={t`Reject`}
                          onClick={() => setConfirmReject(true)}
                        />
                      )}
                      <Button
                        size="small"
                        variant="primary"
                        label={t`Accept`}
                        onClick={() => handleMemberStatusChange(MEMBER_STATUSES.ACCEPTED)}
                      />
                    </>
                  )}
                  {isAccepted &&
                    !isPending &&
                    (confirmRevoke ? (
                      <Button
                        size="small"
                        variant="primary-danger"
                        label={t`Confirm`}
                        onClick={() => {
                          setConfirmRevoke(false)
                          handleMemberStatusChange(MEMBER_STATUSES.REJECTED)
                        }}
                      />
                    ) : (
                      <Button size="small" label={t`Revoke`} onClick={() => setConfirmRevoke(true)} />
                    ))}
                </>
              )}
            </Stack>
          ) : null
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

              {/* Own image: full actions */}
              {permissions.canUpdate && (
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
              {permissions.canDelete && !image.protected && (
                <PopupMenuItem label={t`Delete`} onClick={() => onDelete(image)} />
              )}
            </PopupMenuOptions>
          </PopupMenu>
        )}
      </DataGridCell>
    </DataGridRow>
  )
}

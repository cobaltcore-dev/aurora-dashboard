import {
  Button,
  Stack,
  Status,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuOptions,
  PopupMenuItem,
  toast,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams, useSearch } from "@tanstack/react-router"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ImageDetailsView } from "./-components/ImageDetailsView"
import { EditImageDetailsModal } from "./-components/EditImageDetailsModal"
import { EditImageMetadataModal } from "./-components/EditImageMetadataModal"
import { DeleteImageModal } from "./-components/DeleteImageModal"
import { ActivateImageModal } from "./-components/ActivateImageModal"
import { DeactivateImageModal } from "./-components/DeactivateImageModal"
import { IMAGE_STATUSES, IMAGE_VISIBILITY } from "../-constants/filters"
import { GlanceImage, MemberStatus } from "@/server/Compute/types/image"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import {
  getImageAccessStatusUpdatedToast,
  getImageAccessStatusErrorToast,
  getImageUpdatedToast,
  getImageActivatedToast,
  getImageActivationErrorToast,
  getImageDeactivatedToast,
  getImageDeactivationErrorToast,
  getImageVisibilityUpdatedToast,
  getImageVisibilityUpdateErrorToast,
} from "./-components/ImageToastNotifications"
import { useState } from "react"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/images/$imageId")({
  staticData: {
    section: "compute",
    service: "images",
    analytics: {
      name: "compute.images.detail",
    },
  } satisfies RouteInfo,
  validateSearch: z.object({
    tab: z.enum(["details", "sharing"]).optional(),
  }),
  loader: async ({ context, params }) => {
    try {
      const image = await context.trpcClient?.compute.getImageById.query({
        project_id: params.projectId,
        imageId: params.imageId,
      })
      return { imageTitle: (image?.name as string | undefined) ?? image?.id ?? null }
    } catch {
      return { imageTitle: null }
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.imageTitle ?? "Image Details" }],
  }),
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if none of compute services available
    if (!serviceIndex["image"] && !serviceIndex["compute"]) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }

    if (!serviceIndex["image"]["glance"]) {
      // Redirect to the "Compute Services Overview" page if the "Glance" service is not available
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId: params.projectId },
      })
    }
  },
})

function RouteComponent() {
  const { projectId, imageId } = useParams({
    from: "/_auth/projects/$projectId/compute/images/$imageId",
  })
  const { tab } = useSearch({
    from: "/_auth/projects/$projectId/compute/images/$imageId",
  })

  const navigate = useNavigate()
  const { t } = useLingui()

  const {
    data: image,
    status,
    error,
  } = trpcReact.compute.getImageById.useQuery({ project_id: projectId, imageId: imageId })

  useSetBreadcrumb(Route.id, image?.name as string | undefined)

  const { data: permissionsData } = trpcReact.compute.canUser.useQuery({
    project_id: projectId,
    permission: [
      "images:delete",
      "images:update",
      "images:create_member",
      "images:delete_member",
      "images:update_member",
    ],
  })

  const permissions = {
    canDelete: permissionsData?.[0] ?? false,
    canUpdate: permissionsData?.[1] ?? false,
    canCreateMember: permissionsData?.[2] ?? false,
    canDeleteMember: permissionsData?.[3] ?? false,
    canUpdateMember: permissionsData?.[4] ?? false,
  }

  const utils = trpcReact.useUtils()

  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)

  const updateImageMutation = trpcReact.compute.updateImage.useMutation({
    onSuccess: (updatedImage) => {
      utils.compute.getImageById.setData({ project_id: projectId, imageId }, updatedImage)
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const deleteImageMutation = trpcReact.compute.deleteImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const deactivateImageMutation = trpcReact.compute.deactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ project_id: projectId, imageId })
    },
  })

  const reactivateImageMutation = trpcReact.compute.reactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ project_id: projectId, imageId })
    },
  })

  const updateImageVisibilityMutation = trpcReact.compute.updateImageVisibility.useMutation({
    onSuccess: (updatedImage) => {
      utils.compute.getImageById.setData({ project_id: projectId, imageId }, updatedImage)
    },
  })

  const isSharedWithMe =
    image?.visibility === IMAGE_VISIBILITY.SHARED && image?.owner !== undefined && image?.owner !== projectId

  const { data: myMemberData } = trpcReact.compute.getImageMember.useQuery(
    { project_id: projectId, imageId: imageId, memberId: projectId },
    { enabled: isSharedWithMe && !!imageId && !!projectId }
  )

  const updateMemberMutation = trpcReact.compute.updateImageMember.useMutation({
    onSuccess: () => {
      utils.compute.getImageMember.invalidate({ project_id: projectId, imageId: imageId, memberId: projectId })
      utils.compute.listImageMembers.invalidate({ project_id: projectId, imageId: imageId })
      utils.compute.listImagesWithPagination.invalidate()
      utils.compute.listSharedImagesByMemberStatus.invalidate()
    },
  })

  const handleMemberStatusChange = async (newStatus: MemberStatus) => {
    try {
      await updateMemberMutation.mutateAsync({ project_id: projectId, imageId, memberId: projectId, status: newStatus })
      const { message, ...options } = getImageAccessStatusUpdatedToast(newStatus)
      toast.info(message, options)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message
      const { message, ...options } = getImageAccessStatusErrorToast(errorMessage)
      toast.error(message, options)
    }
  }

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/compute/images",
      params: { projectId },
    })
  }

  const isLoading =
    updateImageMutation.isPending ||
    deleteImageMutation.isPending ||
    deactivateImageMutation.isPending ||
    reactivateImageMutation.isPending ||
    updateImageVisibilityMutation.isPending

  const convertToJsonPatchOperations = (
    updatedProperties: Partial<GlanceImage>,
    originalImage: GlanceImage
  ): Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> => {
    const operations: Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> = []
    Object.entries(updatedProperties).forEach(([key, value]) => {
      const path = `/${key}`
      if (value === null || value === undefined) {
        if (key in originalImage) operations.push({ op: "remove", path })
      } else {
        const propertyExists = key in originalImage
        operations.push({ op: propertyExists ? "replace" : "add", path, value })
      }
    })
    return operations
  }

  const handleSaveEdit = async (updatedProperties: Partial<GlanceImage>): Promise<boolean> => {
    if (!image) return false
    const operations = convertToJsonPatchOperations(updatedProperties, image)
    try {
      await updateImageMutation.mutateAsync({ project_id: projectId, imageId, operations })
      setEditDetailsModalOpen(false)
      const { message, ...options } = getImageUpdatedToast(String(image.name ?? image.id))
      toast.success(message, options)
      return true
    } catch {
      return false
    }
  }

  const handleDelete = async (deletedImage: GlanceImage) => {
    try {
      await deleteImageMutation.mutateAsync({ project_id: projectId, imageId: deletedImage.id })
      setDeleteModalOpen(false)
      handleBack()
    } catch {
      setDeleteModalOpen(false)
    }
  }

  const handleActivate = async (img: GlanceImage) => {
    try {
      await reactivateImageMutation.mutateAsync({ project_id: projectId, imageId: img.id })
      setActivateModalOpen(false)
      const { message, ...options } = getImageActivatedToast(String(img.name ?? img.id))
      toast.success(message, options)
    } catch (error) {
      setActivateModalOpen(false)
      const { message, ...options } = getImageActivationErrorToast(img.id, (error as Error)?.message ?? "")
      toast.error(message, options)
    }
  }

  const handleDeactivate = async (img: GlanceImage) => {
    try {
      await deactivateImageMutation.mutateAsync({ project_id: projectId, imageId: img.id })
      setDeactivateModalOpen(false)
      const { message, ...options } = getImageDeactivatedToast(String(img.name ?? img.id))
      toast.success(message, options)
    } catch (error) {
      setDeactivateModalOpen(false)
      const { message, ...options } = getImageDeactivationErrorToast(img.id, (error as Error)?.message ?? "")
      toast.error(message, options)
    }
  }

  const handleUpdateVisibility = async (newVisibility: "public" | "private" | "shared" | "community") => {
    if (!image) return
    try {
      await updateImageVisibilityMutation.mutateAsync({
        project_id: projectId,
        imageId: image.id,
        visibility: newVisibility,
      })
      const { message, ...options } = getImageVisibilityUpdatedToast(String(image.name ?? image.id), newVisibility)
      toast.success(message, options)
    } catch (error) {
      const { message, ...options } = getImageVisibilityUpdateErrorToast(
        String(image.name ?? image.id),
        (error as Error)?.message ?? ""
      )
      toast.error(message, options)
    }
  }

  // Handle loading state
  if (status === "pending") {
    return <Status status="progress" title={t`Loading Image Details...`} />
  }

  // Handle error state
  if (status === "error") {
    const errorMessage = error?.message || "Unknown error"

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading image</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Images</Trans>
        </Button>
      </Stack>
    )
  }

  // Handle no data state
  if (!image) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-highest">
          <Trans>Image not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Images</Trans>
        </Button>
      </Stack>
    )
  }

  const isDeactivated = image.status === IMAGE_STATUSES.DEACTIVATED
  const isPrivate = image.visibility === IMAGE_VISIBILITY.PRIVATE
  const isMemberAccepted = myMemberData?.status === "accepted"
  const isImageOwner = image.owner === projectId

  const canRejectSharedImage = isSharedWithMe && isMemberAccepted && permissions.canUpdateMember
  const canUpdateOwnImage = !isSharedWithMe && permissions.canUpdate
  const canDeleteOwnImage = !isSharedWithMe && permissions.canDelete && !image.protected
  const canManageSharing =
    !isSharedWithMe &&
    isImageOwner &&
    image.visibility === IMAGE_VISIBILITY.SHARED &&
    (permissions.canCreateMember || permissions.canDeleteMember)

  const hasMoreActions = canRejectSharedImage || canUpdateOwnImage || canDeleteOwnImage || canManageSharing

const headerActions = (hasMoreActions || (!isSharedWithMe && permissions.canUpdate)) && (
    <Stack gap="0.5" alignment="center">
      {(hasMoreActions || (!isSharedWithMe && permissions.canUpdate)) && (
        <PopupMenu className="flex items-center">
          <PopupMenuToggle as="div">
            <Button icon="moreVert" title={t`More Actions`} />
          </PopupMenuToggle>
          <PopupMenuOptions>
            {!isSharedWithMe && permissions.canUpdate && (
              <PopupMenuItem
                onClick={() => setEditMetadataModalOpen(true)}
                label={t`Edit Metadata`}
                disabled={isLoading}
              />
            )}
            {canRejectSharedImage && (
              <PopupMenuItem label={t`Reject`} onClick={() => handleMemberStatusChange("rejected")} />
            )}
            {!isSharedWithMe && permissions.canUpdate && (
              <PopupMenuItem
                label={isDeactivated ? t`Activate` : t`Deactivate`}
                onClick={() => (isDeactivated ? setActivateModalOpen(true) : setDeactivateModalOpen(true))}
              />
            )}
            {!isSharedWithMe && permissions.canUpdate && isPrivate && (
              <PopupMenuItem label={t`Set to "Shared"`} onClick={() => handleUpdateVisibility("shared")} />
            )}
            {!isSharedWithMe &&
              isImageOwner &&
              image.visibility === IMAGE_VISIBILITY.SHARED &&
              (permissions.canCreateMember || permissions.canDeleteMember) && (
                <PopupMenuItem
                  label={t`Manage Access`}
                  onClick={() =>
                    navigate({
                      to: "/projects/$projectId/compute/images/$imageId",
                      params: { projectId, imageId: image.id },
                      search: { tab: "sharing" },
                    })
                  }
                />
              )}
            {!isSharedWithMe && permissions.canDelete && !image.protected && (
              <PopupMenuItem label={t`Delete`} onClick={() => setDeleteModalOpen(true)} />
            )}
          </PopupMenuOptions>
        </PopupMenu>
      )}

      {!isSharedWithMe && permissions.canUpdate && (
        <Button onClick={() => setEditDetailsModalOpen(true)} variant="primary" disabled={isLoading}>
          <Trans>Edit Details</Trans>
        </Button>
      )}
    </Stack>
  )

  // Render success state
  return (
    <>
      <ContentHeader title={String(image.name ?? image.id)} projectId={projectId} actions={headerActions} />

      <div className="mt-3">
        <ImageDetailsView
          key={image.id}
          image={image}
          currentProjectId={projectId}
          activeTab={tab ?? "details"}
          onTabChange={(newTab) =>
            navigate({
              search: { tab: newTab === "details" ? undefined : newTab } as unknown as true,
            })
          }
          permissions={{
            canCreateMember: permissions.canCreateMember,
            canDeleteMember: permissions.canDeleteMember,
            canUpdateMember: permissions.canUpdateMember,
          }}
          myMemberData={myMemberData}
          onMemberStatusChange={handleMemberStatusChange}
          isMemberStatusChanging={updateMemberMutation.isPending}
        />
      </div>

      {editDetailsModalOpen && (
        <EditImageDetailsModal
          image={image}
          isOpen={editDetailsModalOpen}
          isLoading={updateImageMutation.isPending}
          onClose={() => setEditDetailsModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}

      {editMetadataModalOpen && (
        <EditImageMetadataModal
          image={image}
          isOpen={editMetadataModalOpen}
          isLoading={updateImageMutation.isPending}
          onClose={() => setEditMetadataModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}

      {deleteModalOpen && (
        <DeleteImageModal
          image={image}
          isOpen={deleteModalOpen}
          isLoading={deleteImageMutation.isPending}
          isDisabled={!!image.protected}
          onClose={() => setDeleteModalOpen(false)}
          onDelete={handleDelete}
        />
      )}

      {activateModalOpen && (
        <ActivateImageModal
          image={image}
          isOpen={activateModalOpen}
          isLoading={reactivateImageMutation.isPending}
          onClose={() => setActivateModalOpen(false)}
          onActivate={handleActivate}
        />
      )}

      {deactivateModalOpen && (
        <DeactivateImageModal
          image={image}
          isOpen={deactivateModalOpen}
          isLoading={deactivateImageMutation.isPending}
          onClose={() => setDeactivateModalOpen(false)}
          onDeactivate={handleDeactivate}
        />
      )}
    </>
  )
}

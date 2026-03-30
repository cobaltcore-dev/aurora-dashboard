import {
  Button,
  ButtonRow,
  Stack,
  Spinner,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuOptions,
  PopupMenuItem,
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { ImageDetailsView } from "../-components/Images/-components/ImageDetailsView"
import { EditImageDetailsModal } from "../-components/Images/-components/EditImageDetailsModal"
import { EditImageMetadataModal } from "../-components/Images/-components/EditImageMetadataModal"
import { DeleteImageModal } from "../-components/Images/-components/DeleteImageModal"
import { ActivateImageModal } from "../-components/Images/-components/ActivateImageModal"
import { DeactivateImageModal } from "../-components/Images/-components/DeactivateImageModal"
import { ManageImageAccessModal } from "../-components/Images/-components/ManageImageAccessModal"
import { ConfirmImageAccessModal } from "../-components/Images/-components/ConfirmImageAccessModal"
import { IMAGE_STATUSES, IMAGE_VISIBILITY } from "../-constants/filters"
import { GlanceImage } from "@/server/Compute/types/image"
import { useState } from "react"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/images/$imageId")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if none of compute services available
    if (!serviceIndex["image"] && !serviceIndex["compute"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    if (!serviceIndex["image"]["glance"]) {
      // Redirect to the "Compute Services Overview" page if the "Glance" service is not available
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/compute/$",
        params: { ...params, _splat: undefined },
      })
    }
  },
})

function RouteComponent() {
  const { accountId, projectId, imageId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/images/$imageId",
  })

  const { setPageTitle } = Route.useRouteContext()
  const navigate = useNavigate()
  const { t } = useLingui()

  const { data: image, status, error } = trpcReact.compute.getImageById.useQuery({ imageId: imageId })

  const { data: permissionsData } = trpcReact.compute.canUserBulk.useQuery([
    "images:delete",
    "images:update",
    "images:create_member",
    "images:delete_member",
    "images:update_member",
  ])

  const permissions = {
    canDelete: permissionsData?.[0] ?? false,
    canUpdate: permissionsData?.[1] ?? false,
    canCreateMember: permissionsData?.[2] ?? false,
    canDeleteMember: permissionsData?.[3] ?? false,
    canUpdateMember: permissionsData?.[4] ?? false,
  }

  const utils = trpcReact.useUtils()

  const updateImageMutation = trpcReact.compute.updateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ imageId })
    },
  })

  const deleteImageMutation = trpcReact.compute.deleteImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const deactivateImageMutation = trpcReact.compute.deactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ imageId })
    },
  })

  const reactivateImageMutation = trpcReact.compute.reactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ imageId })
    },
  })

  const updateImageVisibilityMutation = trpcReact.compute.updateImageVisibility.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate({ imageId })
    },
  })

  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [manageAccessModalOpen, setManageAccessModalOpen] = useState(false)
  const [confirmAccessModalOpen, setConfirmAccessModalOpen] = useState(false)
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  // Type-safe: name kann string | undefined | null sein
  if (image?.name && typeof image.name === "string") {
    setPageTitle(image.name)
  } else if (image?.id) {
    setPageTitle(image.id)
  } else if (status === "error") {
    setPageTitle(t`Error - Image Details`)
  } else if (status === "pending") {
    setPageTitle(t`Loading Image...`)
  } else {
    setPageTitle(t`Image Details`)
  }

  const handleBack = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { accountId, projectId, _splat: "images" },
    })
  }

  const isImageOwner = image?.owner === projectId
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

  const handleSaveEdit = async (updatedProperties: Partial<GlanceImage>) => {
    if (!image) return
    const operations = convertToJsonPatchOperations(updatedProperties, image)
    try {
      await updateImageMutation.mutateAsync({ imageId, operations })
      setEditDetailsModalOpen(false)
      setEditMetadataModalOpen(false)
    } catch {
      // keep modal open on error
    }
  }

  const handleDelete = async (deletedImage: GlanceImage) => {
    try {
      await deleteImageMutation.mutateAsync({ imageId: deletedImage.id })
      setDeleteModalOpen(false)
      handleBack()
    } catch {
      setDeleteModalOpen(false)
    }
  }

  const handleActivate = async (img: GlanceImage) => {
    try {
      await reactivateImageMutation.mutateAsync({ imageId: img.id })
      setActivateModalOpen(false)
    } catch {
      setActivateModalOpen(false)
    }
  }

  const handleDeactivate = async (img: GlanceImage) => {
    try {
      await deactivateImageMutation.mutateAsync({ imageId: img.id })
      setDeactivateModalOpen(false)
    } catch {
      setDeactivateModalOpen(false)
    }
  }

  const handleUpdateVisibility = async (newVisibility: "public" | "private" | "shared" | "community") => {
    if (!image) return
    try {
      await updateImageVisibilityMutation.mutateAsync({ imageId: image.id, visibility: newVisibility })
    } catch {
      // error handled by mutation state
    }
  }

  // Handle loading state
  if (status === "pending") {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Image Details...</Trans>
      </Stack>
    )
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
  const isShared = image.visibility === IMAGE_VISIBILITY.SHARED
  const isPrivate = image.visibility === IMAGE_VISIBILITY.PRIVATE

  // Render success state
  return (
    <>
      <Stack direction="vertical">
        <ButtonRow>
          <PopupMenu>
            <PopupMenuToggle>
              <Button icon="moreVert" disabled={isLoading}>
                <Trans>More Actions</Trans>
              </Button>
            </PopupMenuToggle>
            <PopupMenuOptions>
              {permissions.canUpdate && (
                <PopupMenuItem
                  label={isDeactivated ? t`Activate` : t`Deactivate`}
                  onClick={() => (isDeactivated ? setActivateModalOpen(true) : setDeactivateModalOpen(true))}
                />
              )}
              {permissions.canUpdate && isShared && isImageOwner && (permissions.canCreateMember || permissions.canDeleteMember) && (
                <PopupMenuItem label={t`Manage Access`} onClick={() => setManageAccessModalOpen(true)} />
              )}
              {permissions.canUpdate && isShared && permissions.canUpdateMember && (
                <PopupMenuItem label={t`Review Access`} onClick={() => setConfirmAccessModalOpen(true)} />
              )}
              {permissions.canUpdate && isPrivate && (
                <PopupMenuItem
                  label={t`Set to "Shared"`}
                  onClick={() => handleUpdateVisibility("shared")}
                />
              )}
              {permissions.canDelete && !image.protected && (
                <PopupMenuItem label={t`Delete`} onClick={() => setDeleteModalOpen(true)} />
              )}
            </PopupMenuOptions>
          </PopupMenu>
          {permissions.canUpdate && (
            <Button onClick={() => setEditMetadataModalOpen(true)} disabled={isLoading}>
              <Trans>Edit Metadata</Trans>
            </Button>
          )}
          {permissions.canUpdate && (
            <Button onClick={() => setEditDetailsModalOpen(true)} variant="primary" disabled={isLoading}>
              <Trans>Edit Details</Trans>
            </Button>
          )}
        </ButtonRow>
        <ImageDetailsView image={image} currentProjectId={projectId} />
      </Stack>

      {toastData && <Toast {...toastData} />}

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

      {manageAccessModalOpen && (
        <ManageImageAccessModal
          image={image}
          isOpen={manageAccessModalOpen}
          onClose={() => setManageAccessModalOpen(false)}
          permissions={{
            canCreateMember: permissions.canCreateMember,
            canDeleteMember: permissions.canDeleteMember,
          }}
        />
      )}

      {confirmAccessModalOpen && (
        <ConfirmImageAccessModal
          image={image}
          isOpen={confirmAccessModalOpen}
          onClose={() => setConfirmAccessModalOpen(false)}
          memberId={projectId}
          permissions={{ canUpdateMember: permissions.canUpdateMember }}
          setMessage={setToastData}
        />
      )}
    </>
  )
}

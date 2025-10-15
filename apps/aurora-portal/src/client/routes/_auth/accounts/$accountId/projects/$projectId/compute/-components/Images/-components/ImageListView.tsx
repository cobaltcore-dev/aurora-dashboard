import type { GlanceImage } from "@/server/Compute/types/image"
import {
  Button,
  ContentHeading,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { TrpcClient } from "@/client/trpcClient"
import { TRPCError } from "@trpc/server"
import { Trans } from "@lingui/react/macro"

import { useState } from "react"
import { EditImageModal } from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
import { auroraToast, sonnerToast, ToastProps } from "@/client/components/NotificationCenter/AuroraToast"
import { DeleteImageModal } from "./DeleteImageModal"
import { CreateImageModal } from "./CreateImageModal"

interface ImagePageProps {
  images: GlanceImage[]
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
  client: TrpcClient
}

export function ImageListView({ images, permissions, client }: ImagePageProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // TODO: Replace it with react query capabilities
  // Local state to track the current list of images, caching them to reduce redundant requests
  // and allowing optimistic updates without refetching from the server
  const [cachedImages, setCachedImages] = useState(images)

  const [isLoading, setIsLoading] = useState(false)

  const handleSaveEdit = (updatedImage: GlanceImage) => {
    setEditModalOpen(false)
    const toastProps: Omit<ToastProps, "id"> = {
      title: "Image Instance",
      description: `Image instance "${updatedImage.name || "Unnamed"}" has been updated`,
      variant: "success",
      button: {
        label: "Confirm",
        onClick: () => sonnerToast.dismiss(),
      },
    }
    auroraToast(toastProps)
  }

  const handleCreate = (newImage: Partial<GlanceImage>) => {
    setCreateModalOpen(false)
    const toastProps: Omit<ToastProps, "id"> = {
      title: "Image Instance",
      description: `Image instance "${newImage.name || "Unnamed"}" has been created`,
      variant: "success",
      button: {
        label: "Confirm",
        onClick: () => sonnerToast.dismiss(),
      },
    }
    auroraToast(toastProps)
  }
  const handleDelete = async (deletedImage: GlanceImage) => {
    setEditModalOpen(false)

    try {
      setIsLoading(true)

      await client.compute.deleteImage.mutate({
        imageId: deletedImage.id,
      })

      // TODO: Replace it with react query capabilities
      setCachedImages(cachedImages.filter((image) => deletedImage.id !== image.id))

      auroraToast({
        title: "Image Instance",
        description: `Image instance "${deletedImage.name || "Unnamed"}" has been deleted`,
        variant: "success",
        button: {
          label: "Ok",
          onClick: () => sonnerToast.dismiss(),
        },
      })
    } catch (error) {
      const { message } = error as TRPCError

      auroraToast({
        title: "Unable to Delete Image",
        description: `The image ${deletedImage.id} could not be deleted: ${message}`,
        variant: "error",
        button: {
          label: "Ok",
          onClick: () => sonnerToast.dismiss(),
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivationStatusChange = async (updatedImage: GlanceImage) => {
    try {
      setIsLoading(true)

      const action =
        updatedImage.status === "deactivated" ? client.compute.reactivateImage : client.compute.deactivateImage

      await action.mutate({
        imageId: updatedImage.id,
      })

      // TODO: Replace it with react query capabilities
      setCachedImages(
        cachedImages.map((image) => {
          if (updatedImage.id === image.id) {
            return { ...image, status: image.status === "deactivated" ? "active" : "deactivated" }
          }

          return image
        })
      )

      auroraToast({
        title: "Image Instance",
        description: `Image instance "${updatedImage.name || "Unnamed"}" has been ${updatedImage.status === "deactivated" ? "re-activated" : "deactivated"}`,
        variant: "success",
        button: {
          label: "Ok",
          onClick: () => sonnerToast.dismiss(),
        },
      })
    } catch (error) {
      const { message } = error as TRPCError

      auroraToast({
        title: `Unable to ${updatedImage.status === "deactivated" ? "Re-activate" : "Deactivate"} Image`,
        description: `The image ${updatedImage.id} could not be deleted: ${message}`,
        variant: "error",
        button: {
          label: "Ok",
          onClick: () => sonnerToast.dismiss(),
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openEditModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setEditModalOpen(true)
  }

  const openCreateModal = () => {
    setCreateModalOpen(true)
  }

  const openDeleteModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setDeleteModalOpen(true)
  }

  if (isLoading) {
    return (
      <div data-testid="loading">
        <div data-testid="loading">
          <DataGridRow>
            <DataGridCell colSpan={3}>
              <Stack distribution="center" alignment="center">
                <Spinner variant="primary" />
                <Trans>Loading...</Trans>
              </Stack>
            </DataGridCell>
          </DataGridRow>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold ">Images</h2>
        {permissions.canCreate && (
          <Button onClick={openCreateModal} variant="primary" icon="addCircle">
            Add New Image
          </Button>
        )}
      </div>

      {/* Images Table */}
      {cachedImages.length > 0 ? (
        <>
          <DataGrid columns={8} minContentColumns={[7]} className="images" data-testid="images-table">
            {/* Table Header */}
            <DataGridRow>
              <DataGridHeadCell>
                <Trans>Image Name</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Status</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Visibility</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Size</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Disk Format</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>OS Type</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Created</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell></DataGridHeadCell>
            </DataGridRow>

            {/* Table Body */}
            {cachedImages.map((image) => (
              <ImageTableRow
                image={image}
                key={image.id}
                permissions={permissions}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onActivationStatusChange={handleActivationStatusChange}
              />
            ))}
          </DataGrid>
        </>
      ) : (
        <DataGrid columns={7} className="flavors" data-testid="no-flavors">
          <DataGridRow>
            <DataGridCell colSpan={7}>
              <ContentHeading>
                <Trans>No images found</Trans>
              </ContentHeading>
              <p>
                <Trans>
                  There are no images available for this project with the current filters applied. Try adjusting your
                  filter criteria or create a new image.
                </Trans>
              </p>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      )}
      {selectedImage && (
        <EditImageModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          image={selectedImage}
          onSave={handleSaveEdit}
        />
      )}
      {selectedImage && (
        <DeleteImageModal
          isOpen={deleteModalOpen}
          isLoading={isLoading}
          onClose={() => setDeleteModalOpen(false)}
          image={selectedImage}
          onDelete={handleDelete}
        />
      )}
      <CreateImageModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={handleCreate} />
    </>
  )
}

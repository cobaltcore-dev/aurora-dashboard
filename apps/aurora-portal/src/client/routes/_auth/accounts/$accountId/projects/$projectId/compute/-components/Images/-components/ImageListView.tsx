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
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { TrpcClient } from "@/client/trpcClient"
import { TRPCError } from "@trpc/server"
import { Trans, useLingui } from "@lingui/react/macro"

import { useState } from "react"
import { EditImageModal } from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
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
  const { t } = useLingui()

  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // TODO: Replace it with react query capabilities
  // Local state to track the current list of images, caching them to reduce redundant requests
  // and allowing optimistic updates without refetching from the server
  const [cachedImages, setCachedImages] = useState(images)

  const [isLoading, setIsLoading] = useState(false)

  const handleToastDismiss = () => setToastData(null)

  const handleSaveEdit = (updatedImage: GlanceImage) => {
    setEditModalOpen(false)
    const imageName = updatedImage.name || t`Unnamed`

    setToastData({
      variant: "success",
      children: (
        <Stack direction="vertical" gap="1.5">
          <span>
            <Trans>Image Instance</Trans>
          </span>
          <span className="text-theme-light">
            <Trans>Image instance "{imageName}" has been updated</Trans>
          </span>
        </Stack>
      ),
      autoDismiss: true,
      autoDismissTimeout: 3000,
      onDismiss: handleToastDismiss,
    })
  }

  const handleCreate = (newImage: Partial<GlanceImage>) => {
    setCreateModalOpen(false)
    const imageName = newImage.name || t`Unnamed`

    setToastData({
      variant: "success",
      children: (
        <Stack direction="vertical" gap="1.5">
          <span>
            <Trans>Image Instance</Trans>
          </span>
          <span className="text-theme-light">
            <Trans>Image instance "{imageName}" has been created</Trans>
          </span>
        </Stack>
      ),
      autoDismiss: true,
      autoDismissTimeout: 3000,
      onDismiss: handleToastDismiss,
    })
  }
  const handleDelete = async (deletedImage: GlanceImage) => {
    setEditModalOpen(false)
    const imageName = deletedImage.name || t`Unnamed`
    const imageId = deletedImage.id

    try {
      setIsLoading(true)

      await client.compute.deleteImage.mutate({
        imageId,
      })

      // TODO: Replace it with react query capabilities
      setCachedImages(cachedImages.filter((image) => imageId !== image.id))

      setToastData({
        variant: "success",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span>
              <Trans>Image Instance</Trans>
            </span>
            <span className="text-theme-light">
              <Trans>Image instance "{imageName}" has been deleted</Trans>
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
    } catch (error) {
      const { message } = error as TRPCError

      setToastData({
        variant: "error",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span>
              <Trans>Unable to Delete Image</Trans>
            </span>
            <span className="text-theme-light">
              <Trans>
                The image "{imageId}" could not be deleted: {message}
              </Trans>
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLaunch = (image: GlanceImage) => {
    const imageName = image.name || t`Unnamed`

    setToastData({
      variant: "success",
      children: (
        <Stack direction="vertical" gap="1.5">
          <span>
            <Trans>Launch Instance</Trans>
          </span>
          <span className="text-theme-light">
            <Trans>Launching instance from image "{imageName}"</Trans>
          </span>
        </Stack>
      ),
      autoDismiss: true,
      autoDismissTimeout: 3000,
      onDismiss: handleToastDismiss,
    })
  }

  const handleActivationStatusChange = async (updatedImage: GlanceImage) => {
    const imageName = updatedImage.name || t`Unnamed`
    const imageId = updatedImage.id

    try {
      setIsLoading(true)

      const action =
        updatedImage.status === "deactivated" ? client.compute.reactivateImage : client.compute.deactivateImage

      await action.mutate({
        imageId,
      })

      // TODO: Replace it with react query capabilities
      setCachedImages(
        cachedImages.map((image) => {
          if (imageId === image.id) {
            return { ...image, status: image.status === "deactivated" ? "active" : "deactivated" }
          }

          return image
        })
      )

      setToastData({
        variant: "success",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span>
              <Trans>Image Instance</Trans>
            </span>
            <span className="text-theme-light">
              {updatedImage.status === "deactivated" ? (
                <Trans>Image instance "{imageName}" has been re-activated</Trans>
              ) : (
                <Trans>Image instance "{imageName}" has been deactivated</Trans>
              )}
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
    } catch (error) {
      const { message } = error as TRPCError

      setToastData({
        variant: "error",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span>
              {updatedImage.status === "deactivated" ? (
                <Trans>Unable to Re-activate Image</Trans>
              ) : (
                <Trans>Unable to Deactivate Image</Trans>
              )}
            </span>
            <span className="text-theme-light">
              {updatedImage.status === "deactivated" ? (
                <Trans>
                  The image "{imageId}" could not be re-activated: {message}
                </Trans>
              ) : (
                <Trans>
                  The image "{imageId}" could not be deactivated: {message}
                </Trans>
              )}
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
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
                onLaunch={handleLaunch}
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
      {toastData && (
        <Toast {...toastData} className="fixed top-5 right-5 z-50 border border-theme-light rounded-lg shadow-lg" />
      )}
    </>
  )
}

import { useState, useEffect, useRef, ReactNode, forwardRef } from "react"
import type { GlanceImage } from "@/server/Compute/types/image"
import {
  Button,
  ButtonProps,
  Checkbox,
  ContentHeading,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  Spinner,
  Stack,
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { TRPCError } from "@trpc/server"
import { Trans, useLingui } from "@lingui/react/macro"
import { EditImageModal } from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
import { DeleteImageModal } from "./DeleteImageModal"
import { CreateImageModal } from "./CreateImageModal"
import { NotificationText } from "./NotificationText"
import { DeleteImagesModal } from "./DeleteAllImagesModal"
import { DeactivateImagesModal } from "./DeactivateImagesModal"
import { ActivateImagesModal } from "./ActivateImagesModal"

interface ImagePageProps {
  images: GlanceImage[]
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isFetching?: boolean
  fetchNextPage?: () => void
  children?: ReactNode
}

export function ImageListView({
  images,
  permissions,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  fetchNextPage,
  children,
}: ImagePageProps) {
  const { t } = useLingui()

  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [deactivateAllModalOpen, setDeactivateAllModalOpen] = useState(false)
  const [activateAllModalOpen, setActivateAllModalOpen] = useState(false)

  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)
  const [selectedImages, setSelectedImages] = useState<Array<string>>([])

  const deletableImages = selectedImages.filter((imageId) => !images.find((image) => image.id === imageId)?.protected)
  const protectedImages = selectedImages.filter((imageId) => images.find((image) => image.id === imageId)?.protected)
  const activeImages = selectedImages.filter(
    (imageId) => images.find((image) => image.id === imageId)?.status === "active"
  )
  const deactivatedImages = selectedImages.filter(
    (imageId) => images.find((image) => image.id === imageId)?.status === "deactivated"
  )

  const isDeleteAllDisabled =
    !permissions.canDelete ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.protected)
  const isDeactivateAllDisabled =
    !permissions.canEdit ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "deactivated")
  const isActivateAllDisabled =
    !permissions.canEdit ||
    images.filter((image) => selectedImages.includes(image.id)).every((image) => image.status === "active")

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage?.()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const utils = trpcReact.useUtils()

  const deleteImageMutation = trpcReact.compute.deleteImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const deactivateImageMutation = trpcReact.compute.deactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const reactivateImageMutation = trpcReact.compute.reactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const isLoading =
    deleteImageMutation.isPending || deactivateImageMutation.isPending || reactivateImageMutation.isPending

  const handleToastDismiss = () => setToastData(null)

  const handleSaveEdit = (updatedImage: GlanceImage) => {
    setEditModalOpen(false)
    const imageName = updatedImage.name || updatedImage.id

    setToastData({
      variant: "success",
      children: (
        <NotificationText
          title={<Trans>Image Instance</Trans>}
          description={<Trans>Image instance "{imageName}" has been updated</Trans>}
        />
      ),
      autoDismiss: true,
      autoDismissTimeout: 3000,
      onDismiss: handleToastDismiss,
    })

    utils.compute.listImagesWithPagination.invalidate()
  }

  const handleCreate = (newImage: Partial<GlanceImage>) => {
    setCreateModalOpen(false)
    const imageName = newImage.name || t`Unnamed`

    setToastData({
      variant: "success",
      children: (
        <NotificationText
          title={<Trans>Image Instance</Trans>}
          description={<Trans>Image instance "{imageName}" has been created</Trans>}
        />
      ),
      autoDismiss: true,
      autoDismissTimeout: 3000,
      onDismiss: handleToastDismiss,
    })

    utils.compute.listImagesWithPagination.invalidate()
  }

  const handleDelete = async (deletedImage: GlanceImage) => {
    setEditModalOpen(false)
    const imageName = deletedImage.name || deletedImage.id
    const imageId = deletedImage.id

    try {
      await deleteImageMutation.mutateAsync({ imageId })

      setToastData({
        variant: "success",
        children: (
          <NotificationText
            title={<Trans>Image Instance</Trans>}
            description={<Trans>Image instance "{imageName}" has been deleted</Trans>}
          />
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
          <NotificationText
            title={<Trans>Unable to Delete Image</Trans>}
            description={
              <Trans>
                The image "{imageId}" could not be deleted: {message}
              </Trans>
            }
          />
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
    }
  }

  const handleActivationStatusChange = async (updatedImage: GlanceImage) => {
    const imageName = updatedImage.name || updatedImage.id
    const imageId = updatedImage.id

    try {
      const mutation = updatedImage.status === "deactivated" ? reactivateImageMutation : deactivateImageMutation

      await mutation.mutateAsync({ imageId })

      setToastData({
        variant: "success",
        children: (
          <NotificationText
            title={<Trans>Image Instance</Trans>}
            description={
              updatedImage.status === "deactivated" ? (
                <Trans>Image instance "{imageName}" has been activated</Trans>
              ) : (
                <Trans>Image instance "{imageName}" has been deactivated</Trans>
              )
            }
          />
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
          <NotificationText
            title={
              updatedImage.status === "deactivated" ? (
                <Trans>Unable to Re-activate Image</Trans>
              ) : (
                <Trans>Unable to Deactivate Image</Trans>
              )
            }
            description={
              updatedImage.status === "deactivated" ? (
                <Trans>
                  The image "{imageId}" could not be re-activated: {message}
                </Trans>
              ) : (
                <Trans>
                  The image "{imageId}" could not be deactivated: {message}
                </Trans>
              )
            }
          />
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
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
        <DataGridRow>
          <DataGridCell colSpan={3}>
            <Stack distribution="center" alignment="center">
              <Spinner variant="primary" />
              <Trans>Loading...</Trans>
            </Stack>
          </DataGridCell>
        </DataGridRow>
      </div>
    )
  }

  return (
    <>
      {/* Header with Add Button */}
      <Stack distribution="end" alignment="center" gap="4" className="mb-6">
        {selectedImages.length > 0 && (
          <PopupMenu>
            <PopupMenuToggle
              as={forwardRef<HTMLButtonElement, ButtonProps>(({ onClick = undefined, ...props }, ref) => (
                <Button variant="subdued" icon="moreVert" ref={ref} onClick={onClick} {...props}>
                  More Actions
                </Button>
              ))}
            />
            <PopupMenuOptions>
              <PopupMenuItem
                disabled={isDeleteAllDisabled}
                label={t`Delete All`}
                onClick={() => setDeleteAllModalOpen(true)}
              />
              <PopupMenuItem
                disabled={isDeactivateAllDisabled}
                label={t`Deactivate All`}
                onClick={() => setDeactivateAllModalOpen(true)}
              />
              <PopupMenuItem
                disabled={isActivateAllDisabled}
                label={t`Activate All`}
                onClick={() => setActivateAllModalOpen(true)}
              />
            </PopupMenuOptions>
          </PopupMenu>
        )}
        {permissions.canCreate && (
          <Button onClick={openCreateModal} variant="primary" icon="addCircle">
            Create Image
          </Button>
        )}
      </Stack>
      <>{children}</>
      {/* Images Table */}
      {images.length > 0 ? (
        <>
          <DataGrid columns={9} minContentColumns={[7]} className="images" data-testid="images-table">
            {/* Table Header */}
            <DataGridRow>
              <DataGridHeadCell>
                <Checkbox
                  checked={selectedImages.length === images.length}
                  onChange={() => {
                    if (selectedImages.length === images.length) {
                      return setSelectedImages([])
                    }

                    return setSelectedImages(images.map((image) => image.id))
                  }}
                />
              </DataGridHeadCell>
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
                <Trans>Protected</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Size</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Disk Format</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Created</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell />
            </DataGridRow>

            {/* Table Body */}
            {images.map((image) => (
              <ImageTableRow
                image={image}
                isSelected={!!selectedImages.find((imageId) => imageId === image.id)}
                key={image.id}
                permissions={permissions}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onSelect={(image: GlanceImage) => {
                  const isImageSelected = !!selectedImages.find((imageId) => imageId === image.id)

                  if (isImageSelected) {
                    return setSelectedImages(selectedImages.filter((imageId) => imageId !== image.id))
                  }

                  setSelectedImages([...selectedImages, image.id])
                }}
                onActivationStatusChange={handleActivationStatusChange}
              />
            ))}
          </DataGrid>

          {/* Infinite Scroll Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4">
              <Stack distribution="center" alignment="center">
                {isFetchingNextPage ? (
                  <>
                    <Spinner variant="primary" size="small" />
                    <Trans>Loading more...</Trans>
                  </>
                ) : (
                  <Button
                    onClick={() => fetchNextPage?.()}
                    variant="subdued"
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    <Trans>Load More</Trans>
                  </Button>
                )}
              </Stack>
            </div>
          )}
          {isFetching && !isFetchingNextPage && (
            <div className="py-2">
              <Stack distribution="center" alignment="center">
                <Trans>Fetching...</Trans>
              </Stack>
            </div>
          )}
        </>
      ) : (
        <DataGrid columns={7} className="images" data-testid="no-images">
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
          image={selectedImage}
          isOpen={deleteModalOpen}
          isLoading={isLoading}
          isDisabled={!selectedImage.protected && permissions.canDelete}
          onClose={() => setDeleteModalOpen(false)}
          onDelete={handleDelete}
        />
      )}
      {selectedImages && (
        <>
          <DeleteImagesModal
            isOpen={deleteAllModalOpen}
            deletableImages={deletableImages}
            protectedImages={protectedImages}
            isLoading={isLoading}
            isDisabled={isDeleteAllDisabled}
            onClose={() => setDeleteAllModalOpen(false)}
            onDelete={(deletableImages: Array<string>) =>
              // TODO: Replace it
              console.log(`Images will be deleted! ${JSON.stringify(deletableImages)}`)
            }
          />
          <DeactivateImagesModal
            isOpen={deactivateAllModalOpen}
            activeImages={activeImages}
            deactivatedImages={deactivatedImages}
            isLoading={isLoading}
            isDisabled={isDeactivateAllDisabled}
            onClose={() => setDeactivateAllModalOpen(false)}
            onDeactivate={(activeImages: Array<string>) =>
              // TODO: Replace it
              console.log(`Images will be deactivated! ${JSON.stringify(activeImages)}`)
            }
          />
          <ActivateImagesModal
            isOpen={activateAllModalOpen}
            deactivatedImages={deactivatedImages}
            activeImages={activeImages}
            isLoading={isLoading}
            isDisabled={isActivateAllDisabled}
            onClose={() => setActivateAllModalOpen(false)}
            onActivate={(deactivatedImages: Array<string>) =>
              // TODO: Replace it
              console.log(`Images will be activated! ${JSON.stringify(deactivatedImages)}`)
            }
          />
        </>
      )}
      <CreateImageModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={handleCreate} />
      {toastData && (
        <Toast {...toastData} className="fixed top-5 right-5 z-50 border border-theme-light rounded-lg shadow-lg" />
      )}
    </>
  )
}

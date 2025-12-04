import { useState, useEffect, useRef, ReactNode, forwardRef } from "react"
import type { CreateImageInput, GlanceImage } from "@/server/Compute/types/image"
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
import { EditImageDetailsModal } from "./EditImageDetailsModal"
import { EditImageMetadataModal } from "./EditImageMetadataModal"
import { ImageTableRow } from "./ImageTableRow"
import { DeleteImageModal } from "./DeleteImageModal"
import { CreateImageModal } from "./CreateImageModal"
import { DeleteImagesModal } from "./DeleteImagesModal"
import { DeactivateImagesModal } from "./DeactivateImagesModal"
import { ActivateImagesModal } from "./ActivateImagesModal"
import {
  getImageUpdatedToast,
  getImageUpdateErrorToast,
  getImageCreatedToast,
  getImageDeletedToast,
  getImageDeleteErrorToast,
  getImageActivatedToast,
  getImageDeactivatedToast,
  getImageActivationErrorToast,
  getImageDeactivationErrorToast,
  getBulkDeleteSuccessToast,
  getBulkDeleteErrorToast,
  getBulkDeletePartialToast,
  getBulkActivateSuccessToast,
  getBulkActivateErrorToast,
  getBulkActivatePartialToast,
  getBulkDeactivateSuccessToast,
  getBulkDeactivateErrorToast,
  getBulkDeactivatePartialToast,
} from "./ImageToastNotifications"

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

  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false)
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
      utils.compute.getImageById.invalidate()
    },
  })

  const reactivateImageMutation = trpcReact.compute.reactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      utils.compute.getImageById.invalidate()
    },
  })

  const deleteImagesMutation = trpcReact.compute.deleteImages.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      setSelectedImages([])
    },
  })

  const activateImagesMutation = trpcReact.compute.activateImages.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      setSelectedImages([])
    },
  })

  const deactivateImagesMutation = trpcReact.compute.deactivateImages.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      setSelectedImages([])
    },
  })

  const updateImageMutation = trpcReact.compute.updateImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
      utils.compute.getImageById.invalidate()
    },
  })

  const createImageMutation = trpcReact.compute.createImage.useMutation({
    onSuccess: () => {
      utils.compute.listImagesWithPagination.invalidate()
    },
  })

  const uploadImageMutation = trpcReact.compute.uploadImage.useMutation()

  const isLoading =
    deleteImageMutation.isPending ||
    deactivateImageMutation.isPending ||
    reactivateImageMutation.isPending ||
    deleteImagesMutation.isPending ||
    activateImagesMutation.isPending ||
    deactivateImagesMutation.isPending ||
    updateImageMutation.isPending ||
    createImageMutation.isPending ||
    uploadImageMutation.isPending

  const handleToastDismiss = () => setToastData(null)

  /**
   * Converts partial image properties to OpenStack JSON Patch operations
   * Determines whether to use 'add', 'replace', or 'remove' based on original image state
   */
  const convertToJsonPatchOperations = (
    updatedProperties: Partial<GlanceImage>,
    originalImage: GlanceImage
  ): Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> => {
    const operations: Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> = []

    Object.entries(updatedProperties).forEach(([key, value]) => {
      const path = `/${key}`

      if (value === null || value === undefined) {
        // Remove operation for null/undefined values (only if property exists)
        if (key in originalImage) {
          operations.push({ op: "remove", path })
        }
      } else {
        // Check if property exists in original image
        const propertyExists = key in originalImage

        if (propertyExists) {
          // Use 'replace' for existing properties
          operations.push({ op: "replace", path, value })
        } else {
          // Use 'add' for new properties
          operations.push({ op: "add", path, value })
        }
      }
    })

    return operations
  }

  const handleSaveEdit = async (updatedProperties: Partial<GlanceImage>) => {
    if (!selectedImage) return

    const imageId = selectedImage.id
    const imageName = updatedProperties.name || selectedImage.name || imageId

    try {
      // Convert updated properties to JSON Patch operations
      // Pass the original image to determine correct operation types (add/replace/remove)
      const operations = convertToJsonPatchOperations(updatedProperties, selectedImage)

      // Call the update mutation
      await updateImageMutation.mutateAsync({ imageId, operations })

      // Close modals and show success toast
      setEditDetailsModalOpen(false)
      setEditMetadataModalOpen(false)
      setToastData(getImageUpdatedToast(imageName, { onDismiss: handleToastDismiss }))
    } catch (error) {
      const { message } = error as TRPCError

      // Show error toast but keep modal open so user can retry
      setToastData(getImageUpdateErrorToast(imageName, message, { onDismiss: handleToastDismiss }))
    }

    setSelectedImage(null)
  }

  const handleCreate = async (imageData: CreateImageInput, file: File) => {
    const imageName = imageData.name || "Unnamed"

    try {
      // Step 1: Create image
      const createdImage = await createImageMutation.mutateAsync(imageData)

      // Step 2: Convert file to binary
      const fileAsArrayBuffer = await file.arrayBuffer()

      // Step 3: Upload file
      await uploadImageMutation.mutateAsync({
        imageId: createdImage.id,
        imageData: fileAsArrayBuffer,
        contentType: file.type || "application/octet-stream",
      })

      // Step 4: ONLY THEN close modal and show success
      setCreateModalOpen(false)

      // Show success notification
      setToastData(getImageCreatedToast(imageName, { onDismiss: handleToastDismiss }))
    } catch (error) {
      const { message } = error as TRPCError
      // Show error notification, modal stays open
      setToastData(getImageUpdateErrorToast(imageName, message, { onDismiss: handleToastDismiss }))
    }
  }

  const handleDelete = async (deletedImage: GlanceImage) => {
    setEditDetailsModalOpen(false)
    setEditMetadataModalOpen(false)

    const imageName = deletedImage.name || deletedImage.id
    const imageId = deletedImage.id

    try {
      await deleteImageMutation.mutateAsync({ imageId })

      setToastData(getImageDeletedToast(imageName, { onDismiss: handleToastDismiss }))
    } catch (error) {
      const { message } = error as TRPCError

      setToastData(getImageDeleteErrorToast(imageId, message, { onDismiss: handleToastDismiss }))
    }

    setSelectedImage(null)
  }

  const handleActivationStatusChange = async (updatedImage: GlanceImage) => {
    const imageName = updatedImage.name || updatedImage.id
    const imageId = updatedImage.id

    try {
      const mutation = updatedImage.status === "deactivated" ? reactivateImageMutation : deactivateImageMutation

      await mutation.mutateAsync({ imageId })

      const toast =
        updatedImage.status === "deactivated"
          ? getImageActivatedToast(imageName, { onDismiss: handleToastDismiss })
          : getImageDeactivatedToast(imageName, { onDismiss: handleToastDismiss })

      setToastData(toast)
    } catch (error) {
      const { message } = error as TRPCError

      const toast =
        updatedImage.status === "deactivated"
          ? getImageActivationErrorToast(imageId, message, { onDismiss: handleToastDismiss })
          : getImageDeactivationErrorToast(imageId, message, { onDismiss: handleToastDismiss })

      setToastData(toast)
    }
  }

  const openEditDetailsModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setEditDetailsModalOpen(true)
  }

  const openEditMetadataModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setEditMetadataModalOpen(true)
  }

  const openCreateModal = () => {
    setCreateModalOpen(true)
  }

  const openDeleteModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setDeleteModalOpen(true)
  }

  const closeEditDetailsModal = () => {
    setSelectedImage(null)
    setEditDetailsModalOpen(false)
  }

  const closeEditMetadataModal = () => {
    setSelectedImage(null)
    setEditMetadataModalOpen(false)
  }

  const closeDeleteModal = () => {
    setSelectedImage(null)
    setDeleteModalOpen(false)
  }

  const handleBulkDelete = async (imageIds: Array<string>) => {
    setDeleteAllModalOpen(false)

    try {
      const result = await deleteImagesMutation.mutateAsync({ imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      if (failedCount === 0) {
        setToastData(getBulkDeleteSuccessToast(successCount, totalCount, { onDismiss: handleToastDismiss }))
      } else if (successCount === 0) {
        setToastData(getBulkDeleteErrorToast(failedCount, totalCount, { onDismiss: handleToastDismiss }))
      } else {
        setToastData(getBulkDeletePartialToast(successCount, failedCount, { onDismiss: handleToastDismiss }))
      }
    } catch (error) {
      const { message } = error as TRPCError

      console.log("Bulk delete error: ", message)

      setToastData(
        getBulkDeleteErrorToast(imageIds.length, imageIds.length, {
          onDismiss: handleToastDismiss,
        })
      )
    }
  }

  const handleBulkActivate = async (imageIds: Array<string>) => {
    setActivateAllModalOpen(false)

    try {
      const result = await activateImagesMutation.mutateAsync({ imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      if (failedCount === 0) {
        setToastData(getBulkActivateSuccessToast(successCount, totalCount, { onDismiss: handleToastDismiss }))
      } else if (successCount === 0) {
        setToastData(getBulkActivateErrorToast(failedCount, totalCount, { onDismiss: handleToastDismiss }))
      } else {
        setToastData(getBulkActivatePartialToast(successCount, failedCount, { onDismiss: handleToastDismiss }))
      }
    } catch (error) {
      const { message } = error as TRPCError

      console.log("Bulk activate error: ", message)

      setToastData(
        getBulkActivateErrorToast(imageIds.length, imageIds.length, {
          onDismiss: handleToastDismiss,
        })
      )
    }
  }

  const handleBulkDeactivate = async (imageIds: Array<string>) => {
    setDeactivateAllModalOpen(false)

    try {
      const result = await deactivateImagesMutation.mutateAsync({ imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      if (failedCount === 0) {
        setToastData(getBulkDeactivateSuccessToast(successCount, totalCount, { onDismiss: handleToastDismiss }))
      } else if (successCount === 0) {
        setToastData(getBulkDeactivateErrorToast(failedCount, totalCount, { onDismiss: handleToastDismiss }))
      } else {
        setToastData(getBulkDeactivatePartialToast(successCount, failedCount, { onDismiss: handleToastDismiss }))
      }
    } catch (error) {
      const { message } = error as TRPCError

      console.log("Bulk deactivate error: ", message)

      setToastData(
        getBulkDeactivateErrorToast(imageIds.length, imageIds.length, {
          onDismiss: handleToastDismiss,
        })
      )
    }
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
                onEditDetails={openEditDetailsModal}
                onEditMetadata={openEditMetadataModal}
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
        <EditImageDetailsModal
          isOpen={editDetailsModalOpen}
          onClose={closeEditDetailsModal}
          image={selectedImage}
          onSave={handleSaveEdit}
          isLoading={updateImageMutation.isPending}
        />
      )}
      {selectedImage && (
        <EditImageMetadataModal
          isOpen={editMetadataModalOpen}
          onClose={closeEditMetadataModal}
          image={selectedImage}
          onSave={handleSaveEdit}
          isLoading={updateImageMutation.isPending}
        />
      )}
      {selectedImage && (
        <DeleteImageModal
          image={selectedImage}
          isOpen={deleteModalOpen}
          isLoading={isLoading}
          isDisabled={selectedImage.protected || !permissions.canDelete}
          onClose={closeDeleteModal}
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
            onDelete={handleBulkDelete}
          />
          <DeactivateImagesModal
            isOpen={deactivateAllModalOpen}
            activeImages={activeImages}
            deactivatedImages={deactivatedImages}
            isLoading={isLoading}
            isDisabled={isDeactivateAllDisabled}
            onClose={() => setDeactivateAllModalOpen(false)}
            onDeactivate={handleBulkDeactivate}
          />
          <ActivateImagesModal
            isOpen={activateAllModalOpen}
            deactivatedImages={deactivatedImages}
            activeImages={activeImages}
            isLoading={isLoading}
            isDisabled={isActivateAllDisabled}
            onClose={() => setActivateAllModalOpen(false)}
            onActivate={handleBulkActivate}
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

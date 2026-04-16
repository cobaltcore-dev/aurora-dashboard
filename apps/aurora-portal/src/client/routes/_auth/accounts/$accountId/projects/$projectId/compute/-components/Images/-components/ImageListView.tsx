import { useState, useEffect, useRef, ReactNode } from "react"
import type { CreateImageInput, GlanceImage, ImageVisibility } from "@/server/Compute/types/image"
import {
  Button,
  Checkbox,
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
import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { FastifyError } from "fastify"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { EditImageDetailsModal } from "./EditImageDetailsModal"
import { EditImageMetadataModal } from "./EditImageMetadataModal"
import { ImageTableRow } from "./ImageTableRow"
import { DeleteImageModal } from "./DeleteImageModal"
import { DeactivateImageModal } from "./DeactivateImageModal"
import { ActivateImageModal } from "./ActivateImageModal"
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
  getImageCreateErrorToast,
  getImageFileUploadErrorToast,
  getImageVisibilityUpdatedToast,
  getImageVisibilityUpdateErrorToast,
} from "./ImageToastNotifications"
import { ManageImageAccessModal } from "./ManageImageAccessModal"
import { IMAGE_STATUSES } from "../../../-constants/filters"

interface ImagePageProps {
  images: GlanceImage[]
  suggestedImages: GlanceImage[]
  acceptedImages: GlanceImage[]
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isFetching?: boolean
  fetchNextPage?: () => void
  children?: ReactNode
  selectedImages: Array<string>
  setSelectedImages: (images: Array<string>) => void
  deleteAllModalOpen: boolean
  setDeleteAllModalOpen: (open: boolean) => void
  deactivateAllModalOpen: boolean
  setDeactivateAllModalOpen: (open: boolean) => void
  activateAllModalOpen: boolean
  setActivateAllModalOpen: (open: boolean) => void
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  deletableImages: Array<string>
  protectedImages: Array<string>
  activeImages: Array<string>
  deactivatedImages: Array<string>
  onImageUpdated: (image: GlanceImage) => void
}

export function ImageListView({
  images,
  suggestedImages,
  acceptedImages,
  permissions,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  fetchNextPage,
  children,
  selectedImages,
  setSelectedImages,
  deleteAllModalOpen,
  setDeleteAllModalOpen,
  deactivateAllModalOpen,
  setDeactivateAllModalOpen,
  activateAllModalOpen,
  setActivateAllModalOpen,
  createModalOpen,
  setCreateModalOpen,
  deletableImages,
  protectedImages,
  activeImages,
  deactivatedImages,
  onImageUpdated,
}: ImagePageProps) {
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [manageAccessModalOpen, setManageAccessModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)
  const [isCreateInProgress, setCreateInProgress] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const hasAutoFetchedRef = useRef(false)

  // Reset the auto-fetch flag whenever a fresh result set arrives (hasNextPage flips back to true)
  useEffect(() => {
    if (hasNextPage) {
      hasAutoFetchedRef.current = false
    }
  }, [hasNextPage])

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAutoFetchedRef.current) {
          hasAutoFetchedRef.current = true
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

  const updateImageVisibilityMutation = trpcReact.compute.updateImageVisibility.useMutation({
    onSuccess: (updatedImage) => {
      onImageUpdated(updatedImage)
    },
  })

  const { data } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId: uploadId || "" },
    {
      enabled: !!uploadId && uploadImageMutation.isPending,
      onComplete() {
        if (!manageAccessModalOpen && !toastData && uploadId && uploadImageMutation.isSuccess) {
          setToastData(getImageCreatedToast(uploadId, { onDismiss: handleToastDismiss }))
        }
      },
    }
  )

  const isLoading =
    deleteImageMutation.isPending ||
    deactivateImageMutation.isPending ||
    reactivateImageMutation.isPending ||
    deleteImagesMutation.isPending ||
    activateImagesMutation.isPending ||
    deactivateImagesMutation.isPending ||
    updateImageMutation.isPending

  const handleToastDismiss = () => setToastData(null)

  const handleUpdateImageVisibility = async (imageId: string, newVisibility: ImageVisibility, imageName: string) => {
    try {
      await updateImageVisibilityMutation.mutateAsync({
        imageId,
        visibility: newVisibility,
      })

      setToastData(
        getImageVisibilityUpdatedToast(imageName, newVisibility, {
          onDismiss: handleToastDismiss,
        })
      )
    } catch (error) {
      const errorMessage =
        (error as TRPCClientError<InferrableClientTypes>)?.message || t`Failed to update visibility to ${newVisibility}`

      setToastData(
        getImageVisibilityUpdateErrorToast(imageName, errorMessage, {
          onDismiss: handleToastDismiss,
        })
      )
    }
  }

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
      const { message } = error as TRPCClientError<InferrableClientTypes>

      // Show error toast but keep modal open so user can retry
      setToastData(getImageUpdateErrorToast(imageName, message, { onDismiss: handleToastDismiss }))
    }

    setSelectedImage(null)
  }

  const handleCreate = async (imageData: CreateImageInput, file: File) => {
    const imageName = imageData.name || "Unnamed"

    try {
      setCreateInProgress(true)

      // Step 1: Create image
      const createdImage = await createImageMutation.mutateAsync(imageData)

      // Step 2: Create FormData WITH file
      const formData = new FormData()
      formData.append("imageId", createdImage.id)
      formData.append("fileSize", `${file.size}`)
      formData.append("file", file)

      setUploadId(createdImage.id)

      // Step 3: Upload file
      // FormData is handled by Fastify's multipart hook before reaching tRPC input validation.
      // The tRPC client sends FormData as HTTP POST body, which Fastify processes and stores
      // in request context, so we don't use tRPC input validator for multipart.

      // @ts-expect-error Argument of type 'FormData' is not assignable to parameter of type 'void'.ts(2345)
      await uploadImageMutation.mutateAsync(formData)

      // Show success notification and re-fetch image list
      setToastData(getImageCreatedToast(imageName, { onDismiss: handleToastDismiss }))
      utils.compute.listImagesWithPagination.invalidate()
    } catch (error) {
      // Show error notification based on failure point
      if (error instanceof TRPCClientError && error.data.path === "compute.createImage") {
        setToastData(getImageCreateErrorToast(imageName, error.message, { onDismiss: handleToastDismiss }))
      } else {
        // File upload failed
        const { message } = error as FastifyError

        setToastData(getImageFileUploadErrorToast(file.name, message, { onDismiss: handleToastDismiss }))
      }
    } finally {
      // Complete creation and close modal
      setCreateInProgress(false)
      setCreateModalOpen(false)
      setUploadId(null)
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
      const { message } = error as TRPCClientError<InferrableClientTypes>

      setToastData(getImageDeleteErrorToast(imageId, message, { onDismiss: handleToastDismiss }))
    }

    setSelectedImage(null)
  }

  const handleActivationStatusChange = async (updatedImage: GlanceImage) => {
    if (updatedImage.status !== IMAGE_STATUSES.DEACTIVATED) {
      // Deactivate: show confirmation modal
      setSelectedImage(updatedImage)
      setDeactivateModalOpen(true)
    } else {
      // Activate: show confirmation modal
      setSelectedImage(updatedImage)
      setActivateModalOpen(true)
    }
  }

  const handleActivateSingle = async (image: GlanceImage) => {
    const imageName = image.name || image.id
    const imageId = image.id

    try {
      await reactivateImageMutation.mutateAsync({ imageId })
      setActivateModalOpen(false)
      setSelectedImage(null)
      setToastData(getImageActivatedToast(imageName, { onDismiss: handleToastDismiss }))
    } catch (error) {
      const { message } = error as TRPCClientError<InferrableClientTypes>
      setToastData(getImageActivationErrorToast(imageId, message, { onDismiss: handleToastDismiss }))
    }
  }

  const handleDeactivateSingle = async (image: GlanceImage) => {
    const imageName = image.name || image.id
    const imageId = image.id

    try {
      await deactivateImageMutation.mutateAsync({ imageId })
      setDeactivateModalOpen(false)
      setSelectedImage(null)
      setToastData(getImageDeactivatedToast(imageName, { onDismiss: handleToastDismiss }))
    } catch (error) {
      const { message } = error as TRPCClientError<InferrableClientTypes>
      setToastData(getImageDeactivationErrorToast(imageId, message, { onDismiss: handleToastDismiss }))
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

  const openDeleteModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setDeleteModalOpen(true)
  }

  const openManageAccessModal = (image: GlanceImage) => {
    setSelectedImage(image)
    setManageAccessModalOpen(true)
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

  const closeDeactivateModal = () => {
    setSelectedImage(null)
    setDeactivateModalOpen(false)
  }

  const closeActivateModal = () => {
    setSelectedImage(null)
    setActivateModalOpen(false)
  }

  const closeManageAccessModal = () => {
    setSelectedImage(null)
    setManageAccessModalOpen(false)
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
      const { message } = error as TRPCClientError<InferrableClientTypes>

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
      const { message } = error as TRPCClientError<InferrableClientTypes>

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
      const { message } = error as TRPCClientError<InferrableClientTypes>

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
      <>{children}</>

      <div className="relative">
        {/* Loading overlay when refetching */}
        {isFetching && !isFetchingNextPage && (
          <div className="bg-theme-background-lvl-0/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <Stack direction="vertical" alignment="center" gap="2">
              <Spinner variant="primary" size="large" />
              <span className="text-theme-high font-medium">
                <Trans>Loading images...</Trans>
              </span>
            </Stack>
          </div>
        )}

        {/* Images Table */}
        {images.length > 0 ? (
          <>
            <DataGrid columns={9} minContentColumns={[0, 8]} className="images" data-testid="images-table">
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
                  <Trans>Status</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell>
                  <Trans>Image Name</Trans>
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
                  isSelected={selectedImages.includes(image.id)}
                  isPending={!!suggestedImages.find(({ id: imageId }) => imageId === image.id)}
                  isAccepted={!!acceptedImages.find(({ id: imageId }) => imageId === image.id)}
                  key={image.id}
                  permissions={permissions}
                  onEditDetails={openEditDetailsModal}
                  onEditMetadata={openEditMetadataModal}
                  onDelete={openDeleteModal}
                  onManageAccess={openManageAccessModal}
                  onSelect={(image: GlanceImage) => {
                    const isImageSelected = selectedImages.includes(image.id)

                    if (isImageSelected) {
                      return setSelectedImages(selectedImages.filter((imageId) => imageId !== image.id))
                    }

                    setSelectedImages([...selectedImages, image.id])
                  }}
                  onActivationStatusChange={handleActivationStatusChange}
                  onUpdateVisibility={handleUpdateImageVisibility}
                  setToastData={setToastData}
                  uploadId={uploadId}
                  uploadProgressPercent={data?.percent}
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
                    <Button onClick={() => fetchNextPage?.()} variant="subdued" disabled={isFetchingNextPage}>
                      <Trans>Load More</Trans>
                    </Button>
                  )}
                </Stack>
              </div>
            )}
          </>
        ) : (
          <DataGrid columns={7} minContentColumns={[0, 6]} className="images" data-testid="no-images">
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
          <>
            <EditImageDetailsModal
              isOpen={editDetailsModalOpen}
              onClose={closeEditDetailsModal}
              image={selectedImage}
              onSave={handleSaveEdit}
              isLoading={updateImageMutation.isPending}
            />
            <EditImageMetadataModal
              isOpen={editMetadataModalOpen}
              onClose={closeEditMetadataModal}
              image={selectedImage}
              onSave={handleSaveEdit}
              isLoading={updateImageMutation.isPending}
            />
            <DeleteImageModal
              image={selectedImage}
              isOpen={deleteModalOpen}
              isLoading={isLoading}
              isDisabled={selectedImage.protected || !permissions.canDelete}
              onClose={closeDeleteModal}
              onDelete={handleDelete}
            />
            <DeactivateImageModal
              image={selectedImage}
              isOpen={deactivateModalOpen}
              isLoading={deactivateImageMutation.isPending}
              onClose={closeDeactivateModal}
              onDeactivate={handleDeactivateSingle}
            />
            <ActivateImageModal
              image={selectedImage}
              isOpen={activateModalOpen}
              isLoading={reactivateImageMutation.isPending}
              onClose={closeActivateModal}
              onActivate={handleActivateSingle}
            />
            <ManageImageAccessModal
              image={selectedImage}
              isOpen={manageAccessModalOpen}
              onClose={closeManageAccessModal}
              permissions={permissions}
            />
          </>
        )}

        <DeleteImagesModal
          isOpen={deleteAllModalOpen}
          deletableImages={deletableImages}
          protectedImages={protectedImages}
          isLoading={isLoading}
          onClose={() => setDeleteAllModalOpen(false)}
          onDelete={handleBulkDelete}
        />
        <DeactivateImagesModal
          isOpen={deactivateAllModalOpen}
          activeImages={activeImages}
          deactivatedImages={deactivatedImages}
          isLoading={isLoading}
          onClose={() => setDeactivateAllModalOpen(false)}
          onDeactivate={handleBulkDeactivate}
        />
        <ActivateImagesModal
          isOpen={activateAllModalOpen}
          deactivatedImages={deactivatedImages}
          activeImages={activeImages}
          isLoading={isLoading}
          onClose={() => setActivateAllModalOpen(false)}
          onActivate={handleBulkActivate}
        />
        <CreateImageModal
          isOpen={createModalOpen}
          onClose={() => {
            if (uploadId) {
              utils.compute.listImagesWithPagination.invalidate()
            }

            setCreateModalOpen(false)
          }}
          onCreate={handleCreate}
          isLoading={createImageMutation.isPending || uploadImageMutation.isPending || isCreateInProgress}
          isUploadPending={uploadImageMutation.isPending && !!uploadId}
          uploadProgressPercent={data?.percent}
        />
      </div>

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </>
  )
}

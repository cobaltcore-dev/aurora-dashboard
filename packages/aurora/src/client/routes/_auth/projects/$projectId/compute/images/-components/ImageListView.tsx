import { useState, useRef, ReactNode } from "react"
import { useProjectId } from "@/client/hooks"
import type { CreateImageInput, GlanceImage, ImageVisibility } from "@/server/Compute/types/image"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Pagination,
  Status,
  toast,
} from "@cloudoperators/juno-ui-components"
import { trpcClient, trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { FastifyError } from "fastify"
import { Trans, useLingui } from "@lingui/react/macro"
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
  getImageUploadCancelledToast,
  getImageVisibilityUpdatedToast,
  getImageVisibilityUpdateErrorToast,
} from "./ImageToastNotifications"
import { ManageImageAccessModal } from "./ManageImageAccessModal"
import { convertToJsonPatchOperations } from "../-utils/imageHelpers"
import { IMAGE_STATUSES } from "../../-constants/filters"

interface ImagePageProps {
  images: GlanceImage[]
  permissions: {
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  isFetching?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
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
  deletableImages: Array<GlanceImage>
  protectedImages: Array<GlanceImage>
  activeImages: Array<GlanceImage>
  deactivatedImages: Array<GlanceImage>
  unownedActiveImages: Array<GlanceImage>
  unownedDeactivatedImages: Array<GlanceImage>
  onImageUpdated: (image: GlanceImage) => void
  onImageDeleted: (imageIds: string | string[]) => void
  onMemberStatusChanged: () => void
  hasAnyBulkAction: boolean
  pendingSharedIds: Set<string>
  acceptedSharedIds: Set<string>
  memberStatusView: "all" | "pending" | "accepted"
}

export function ImageListView({
  images,
  permissions,
  isFetching,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
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
  unownedActiveImages,
  unownedDeactivatedImages,
  onImageUpdated,
  onImageDeleted,
  onMemberStatusChanged,
  hasAnyBulkAction,
  pendingSharedIds,
  acceptedSharedIds,
  memberStatusView,
}: ImagePageProps) {
  const projectId = useProjectId()

  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [manageAccessModalOpen, setManageAccessModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)
  const [isCreateInProgress, setCreateInProgress] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [isUploadPending, setIsUploadPending] = useState(false)
  const uploadAbortControllerRef = useRef<AbortController | null>(null)
  const uploadCancelledRef = useRef(false)
  const { t } = useLingui()

  const utils = trpcReact.useUtils()

  const deleteImageMutation = trpcReact.compute.deleteImage.useMutation()

  const deactivateImageMutation = trpcReact.compute.deactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate()
    },
  })

  const reactivateImageMutation = trpcReact.compute.reactivateImage.useMutation({
    onSuccess: () => {
      utils.compute.getImageById.invalidate()
    },
  })

  const deleteImagesMutation = trpcReact.compute.deleteImages.useMutation({
    onSuccess: () => {
      setSelectedImages([])
    },
  })

  const activateImagesMutation = trpcReact.compute.activateImages.useMutation({
    onSuccess: () => {
      setSelectedImages([])
    },
  })

  const deactivateImagesMutation = trpcReact.compute.deactivateImages.useMutation({
    onSuccess: () => {
      setSelectedImages([])
    },
  })

  const updateImageMutation = trpcReact.compute.updateImage.useMutation({
    onSuccess: (updatedImage) => {
      utils.compute.getImageById.setData({ project_id: projectId, imageId: updatedImage.id }, updatedImage)
    },
  })

  const createImageMutation = trpcReact.compute.createImage.useMutation()

  const updateImageVisibilityMutation = trpcReact.compute.updateImageVisibility.useMutation()

  const { data } = trpcReact.compute.watchUploadProgress.useSubscription(
    { project_id: projectId, uploadId: uploadId || "" },
    {
      enabled: !!uploadId && isUploadPending,
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

  const handleUpdateImageVisibility = async (imageId: string, newVisibility: ImageVisibility, imageName: string) => {
    try {
      const updatedImage = await updateImageVisibilityMutation.mutateAsync({
        project_id: projectId,
        imageId,
        visibility: newVisibility,
      })

      onImageUpdated(updatedImage)

      const { message, ...options } = getImageVisibilityUpdatedToast(imageName, newVisibility)
      toast.success(message, options)
    } catch (error) {
      const errorMessage =
        (error as TRPCClientError<InferrableClientTypes>)?.message || t`Failed to update visibility to ${newVisibility}`

      const { message, ...options } = getImageVisibilityUpdateErrorToast(imageName, errorMessage)
      toast.error(message, options)
    }
  }

  const handleSaveEdit = async (updatedProperties: Partial<GlanceImage>): Promise<boolean> => {
    if (!selectedImage) return false

    const imageId = selectedImage.id
    const imageName = updatedProperties.name || selectedImage.name || imageId

    try {
      const operations = convertToJsonPatchOperations(updatedProperties, selectedImage)
      const updatedImage = await updateImageMutation.mutateAsync({ project_id: projectId, imageId, operations })
      setEditDetailsModalOpen(false)
      const { message, ...options } = getImageUpdatedToast(imageName)
      toast.success(message, options)
      setSelectedImage(updatedImage)
      onImageUpdated(updatedImage)
      return true
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""
      const { message, ...options } = getImageUpdateErrorToast(imageName, errorMessage)
      toast.error(message, options)
      setSelectedImage(null)
      return false
    }
  }

  const handleCreate = async (imageData: Omit<CreateImageInput, "project_id">, file: File) => {
    const imageName = imageData.name || "Unnamed"
    let createdImageId: string | null = null

    try {
      setCreateInProgress(true)

      // Step 1: Create image with project_id
      const createdImage = await createImageMutation.mutateAsync({
        project_id: projectId,
        ...imageData,
      })
      createdImageId = createdImage.id

      // Step 2: Upload file via octetInputParser with metadata in custom headers.
      // trpcClient (vanilla) is used so we can pass operation context with headers.
      // An AbortController lets the user cancel the in-flight upload; aborting
      // drops the HTTP connection, which the server maps to an aborted request.
      const abortController = new AbortController()
      uploadAbortControllerRef.current = abortController
      uploadCancelledRef.current = false
      setUploadId(createdImage.id)
      setIsUploadPending(true)

      await trpcClient.compute.uploadImage.mutate(file, {
        signal: abortController.signal,
        context: {
          headers: {
            "x-project-id": projectId,
            "x-upload-id": createdImage.id,
            "x-upload-size": String(file.size),
          },
        },
      })

      // Show success notification
      const { message, ...options } = getImageCreatedToast(imageName)
      toast.success(message, options)

      // Optimistically add the created image to the list
      onImageUpdated(createdImage)

      // Trigger manual refetch through member status change handler
      onMemberStatusChanged()
    } catch (error) {
      // A user-initiated cancellation is not a failure. We reach this branch only
      // once the aborted upload promise has rejected, so the transfer has fully
      // terminated and it is safe to clean up the orphaned image record here
      // (avoids racing the still-running upload).
      if (uploadCancelledRef.current) {
        if (createdImageId) {
          try {
            await deleteImageMutation.mutateAsync({ project_id: projectId, imageId: createdImageId })
            onImageDeleted(createdImageId)
          } catch (cleanupError) {
            const cleanupMessage = (cleanupError as FastifyError)?.message ?? ""
            const { message, ...options } = getImageDeleteErrorToast(createdImageId, cleanupMessage)
            toast.error(message, options)
          }
        }
        return
      }

      // Show error notification based on failure point
      if (error instanceof TRPCClientError && error.data?.path === "compute.createImage") {
        const { message, ...options } = getImageCreateErrorToast(imageName, error.message)
        toast.error(message, options)
      } else {
        // File upload failed
        const uploadErrorMessage = (error as FastifyError)?.message ?? ""

        const { message, ...options } = getImageFileUploadErrorToast(file.name, uploadErrorMessage)
        toast.error(message, options)
      }
    } finally {
      // Complete creation and close modal. Reset the cancellation flag so a later
      // create request is not mistaken for a cancellation.
      uploadAbortControllerRef.current = null
      uploadCancelledRef.current = false
      setCreateInProgress(false)
      setCreateModalOpen(false)
      setIsUploadPending(false)
      setUploadId(null)
    }
  }

  const handleCancelUpload = () => {
    // Flag the cancellation and abort the transfer. handleCreate's catch block
    // runs once the aborted upload rejects and performs the orphan cleanup, so
    // we never race the still-running upload from here.
    uploadCancelledRef.current = true
    uploadAbortControllerRef.current?.abort()

    const { message, ...options } = getImageUploadCancelledToast()
    toast.info(message, options)
    // handleCreate's finally block resets state and closes the modal.
  }

  const handleDelete = async (deletedImage: GlanceImage) => {
    setEditDetailsModalOpen(false)
    setEditMetadataModalOpen(false)

    const imageName = deletedImage.name || deletedImage.id
    const imageId = deletedImage.id

    try {
      await deleteImageMutation.mutateAsync({ project_id: projectId, imageId })

      const { message, ...options } = getImageDeletedToast(imageName)
      toast.success(message, options)
      onImageDeleted(imageId)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""

      const { message, ...options } = getImageDeleteErrorToast(imageId, errorMessage)
      toast.error(message, options)
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
      await reactivateImageMutation.mutateAsync({ project_id: projectId, imageId })

      // Optimistically update the local state
      const updatedImage = { ...image, status: IMAGE_STATUSES.ACTIVE }
      onImageUpdated(updatedImage)

      setActivateModalOpen(false)
      setSelectedImage(null)
      const { message, ...options } = getImageActivatedToast(imageName)
      toast.success(message, options)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""
      const { message, ...options } = getImageActivationErrorToast(imageId, errorMessage)
      toast.error(message, options)
    }
  }

  const handleDeactivateSingle = async (image: GlanceImage) => {
    const imageName = image.name || image.id
    const imageId = image.id

    try {
      await deactivateImageMutation.mutateAsync({ project_id: projectId, imageId })

      // Optimistically update the local state
      const updatedImage = { ...image, status: IMAGE_STATUSES.DEACTIVATED }
      onImageUpdated(updatedImage)

      setDeactivateModalOpen(false)
      setSelectedImage(null)
      const { message, ...options } = getImageDeactivatedToast(imageName)
      toast.success(message, options)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""
      const { message, ...options } = getImageDeactivationErrorToast(imageId, errorMessage)
      toast.error(message, options)
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
    utils.compute.listImagesWithPagination.invalidate()
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
      const result = await deleteImagesMutation.mutateAsync({ project_id: projectId, imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      if (failedCount === 0) {
        const { message, ...options } = getBulkDeleteSuccessToast(successCount, totalCount)
        toast.success(message, options)
      } else if (successCount === 0) {
        const { message, ...options } = getBulkDeleteErrorToast(failedCount, totalCount)
        toast.error(message, options)
      } else {
        const { message, ...options } = getBulkDeletePartialToast(successCount, failedCount)
        toast.warning(message, options)
      }

      if (result.successful.length > 0) onImageDeleted(result.successful)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""

      console.log("Bulk delete error: ", errorMessage)

      const { message, ...options } = getBulkDeleteErrorToast(imageIds.length, imageIds.length)
      toast.error(message, options)
    }
  }

  const handleBulkActivate = async (imageIds: Array<string>) => {
    setActivateAllModalOpen(false)

    try {
      const result = await activateImagesMutation.mutateAsync({ project_id: projectId, imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      // Optimistically update successful images
      result.successful.forEach((imageId) => {
        const image = images.find((img) => img.id === imageId)
        if (image) {
          onImageUpdated({ ...image, status: IMAGE_STATUSES.ACTIVE })
        }
      })

      if (failedCount === 0) {
        const { message, ...options } = getBulkActivateSuccessToast(successCount, totalCount)
        toast.success(message, options)
      } else if (successCount === 0) {
        const { message, ...options } = getBulkActivateErrorToast(failedCount, totalCount)
        toast.error(message, options)
      } else {
        const { message, ...options } = getBulkActivatePartialToast(successCount, failedCount)
        toast.warning(message, options)
      }
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""

      console.log("Bulk activate error: ", errorMessage)

      const { message, ...options } = getBulkActivateErrorToast(imageIds.length, imageIds.length)
      toast.error(message, options)
    }
  }

  const handleBulkDeactivate = async (imageIds: Array<string>) => {
    setDeactivateAllModalOpen(false)

    try {
      const result = await deactivateImagesMutation.mutateAsync({ project_id: projectId, imageIds })

      const successCount = result.successful.length
      const failedCount = result.failed.length
      const totalCount = imageIds.length

      // Optimistically update successful images
      result.successful.forEach((imageId) => {
        const image = images.find((img) => img.id === imageId)
        if (image) {
          onImageUpdated({ ...image, status: IMAGE_STATUSES.DEACTIVATED })
        }
      })

      if (failedCount === 0) {
        const { message, ...options } = getBulkDeactivateSuccessToast(successCount, totalCount)
        toast.success(message, options)
      } else if (successCount === 0) {
        const { message, ...options } = getBulkDeactivateErrorToast(failedCount, totalCount)
        toast.error(message, options)
      } else {
        const { message, ...options } = getBulkDeactivatePartialToast(successCount, failedCount)
        toast.warning(message, options)
      }
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message ?? ""

      console.log("Bulk deactivate error: ", errorMessage)

      const { message, ...options } = getBulkDeactivateErrorToast(imageIds.length, imageIds.length)
      toast.error(message, options)
    }
  }

  const updateCurrentPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange?.(newPage)
    }
  }

  if (isLoading) {
    return (
      <div data-testid="loading">
        <DataGridRow>
          <DataGridCell colSpan={3}>
            <Status status="progress" title={t`Loading...`} />
          </DataGridCell>
        </DataGridRow>
      </div>
    )
  }

  return (
    <>
      <>{children}</>

      <div className="relative">
        {/* Images Table */}
        {isFetching ? (
          <Status status="progress" title={t`Loading Images...`} />
        ) : (
          <>
            <DataGrid
              columns={hasAnyBulkAction ? 9 : 8}
              minContentColumns={hasAnyBulkAction ? [0, 8] : [7]}
              className="images"
              data-testid="images-table"
            >
              {/* Table Header */}
              <DataGridRow>
                {hasAnyBulkAction && <DataGridHeadCell></DataGridHeadCell>}
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

              {images.length > 0 ? (
                images.map((image) => (
                  <ImageTableRow
                    image={image}
                    isSelected={selectedImages.includes(image.id)}
                    isPending={pendingSharedIds.has(image.id)}
                    isAccepted={acceptedSharedIds.has(image.id)}
                    key={image.id}
                    permissions={permissions}
                    onEditDetails={openEditDetailsModal}
                    onEditMetadata={openEditMetadataModal}
                    onDelete={openDeleteModal}
                    onManageAccess={openManageAccessModal}
                    showSelectColumn={hasAnyBulkAction}
                    onSelect={(image: GlanceImage) => {
                      const isImageSelected = selectedImages.includes(image.id)

                      if (isImageSelected) {
                        return setSelectedImages(selectedImages.filter((imageId) => imageId !== image.id))
                      }

                      setSelectedImages([...selectedImages, image.id])
                    }}
                    onActivationStatusChange={handleActivationStatusChange}
                    onUpdateVisibility={handleUpdateImageVisibility}
                    uploadId={uploadId}
                    uploadProgressPercent={data?.percent}
                    onMemberStatusChanged={onMemberStatusChanged}
                  />
                ))
              ) : (
                <DataGridRow>
                  <DataGridCell colSpan={hasAnyBulkAction ? 9 : 8}>
                    <Status
                      status="empty"
                      title={
                        memberStatusView === "accepted"
                          ? t`No Accepted Images Found`
                          : memberStatusView === "pending"
                            ? t`No Suggested Images Found`
                            : t`No Images Found`
                      }
                      body={
                        memberStatusView === "accepted"
                          ? t`There are no accepted shared images for this project with the current filters applied. Try adjusting your filter criteria or check the Suggested Images tab.`
                          : memberStatusView === "pending"
                            ? t`There are no pending shared images for this project with the current filters applied. Try adjusting your filter criteria or check the All Images tab.`
                            : t`There are no images available for this project with the current filters applied. Try adjusting your filter criteria or create a new image.`
                      }
                    />
                  </DataGridCell>
                </DataGridRow>
              )}
            </DataGrid>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center py-4">
                <Pagination
                  variant="input"
                  currentPage={currentPage}
                  pages={totalPages}
                  onPressPrevious={() => updateCurrentPage(Math.max(currentPage - 1, 1))}
                  onPressNext={() => updateCurrentPage(Math.min(currentPage + 1, totalPages))}
                  onSelectChange={(selectedPage: number) => {
                    updateCurrentPage(selectedPage)
                  }}
                  onInputChange={() => {
                    // Input change is handled by the Pagination component internally
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      const inputValue = (e.target as HTMLInputElement).value
                      if (inputValue !== "") {
                        const newPage = parseInt(inputValue, 10)
                        if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                          updateCurrentPage(newPage)
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </>
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
              key="edit-metadata-modal"
              client={trpcClient}
              isOpen={editMetadataModalOpen}
              onClose={closeEditMetadataModal}
              image={selectedImage}
              projectId={projectId}
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
          unownedImages={unownedActiveImages.concat(unownedDeactivatedImages)}
          isLoading={isLoading}
          onClose={() => setDeleteAllModalOpen(false)}
          onDelete={handleBulkDelete}
        />
        <DeactivateImagesModal
          isOpen={deactivateAllModalOpen}
          activeImages={activeImages}
          deactivatedImages={deactivatedImages}
          unownedImages={unownedActiveImages.concat(unownedDeactivatedImages)}
          isLoading={isLoading}
          onClose={() => setDeactivateAllModalOpen(false)}
          onDeactivate={handleBulkDeactivate}
        />
        <ActivateImagesModal
          isOpen={activateAllModalOpen}
          deactivatedImages={deactivatedImages}
          activeImages={activeImages}
          unownedImages={unownedActiveImages.concat(unownedDeactivatedImages)}
          isLoading={isLoading}
          onClose={() => setActivateAllModalOpen(false)}
          onActivate={handleBulkActivate}
        />
        <CreateImageModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreate}
          isLoading={createImageMutation.isPending || isUploadPending || isCreateInProgress}
          isUploadPending={isUploadPending && !!uploadId}
          uploadProgressPercent={data?.percent}
          onCancelUpload={handleCancelUpload}
        />
      </div>
    </>
  )
}

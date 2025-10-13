import type { GlanceImage } from "@/server/Compute/types/image"
import { Button } from "@cloudoperators/juno-ui-components"
import { TrpcClient } from "@/client/trpcClient"
import { TRPCError } from "@trpc/server"

import { useState } from "react"
import { EditImageModal } from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
import { auroraToast, sonnerToast, ToastProps } from "@/client/components/NotificationCenter/AuroraToast"
import { DeleteImageModal } from "./DeleteImageModal"
import { CreateImageModal } from "./CreateImageModal"

interface ImagePageProps {
  images: GlanceImage[]
  client: TrpcClient
}

export function ImageListView({ images, client }: ImagePageProps) {
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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold ">Images</h2>
        <Button onClick={openCreateModal} variant="primary" icon="addCircle">
          Add New Image
        </Button>
      </div>

      {/* Images Table */}
      {cachedImages.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-[#30363d] ">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className=" border-b border-[#30363d]">
                <th className="p-3">Image Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Visibility</th>
                <th className="p-3">Size</th>
                <th className="p-3">Disk Format</th>
                <th className="p-3">OS Type</th>
                <th className="p-3">Created</th>
                <th className="p-3 flex justify-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {cachedImages.map((image, index) => (
                <ImageTableRow
                  image={image}
                  key={image.id}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                  isLast={index === images.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No images available.</p>
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
    </div>
  )
}

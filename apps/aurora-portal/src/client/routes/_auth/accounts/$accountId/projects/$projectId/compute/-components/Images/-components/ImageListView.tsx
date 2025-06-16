import type { GlanceImage } from "@/server/Compute/types/image"

import { useState } from "react"
import { EditImageModal } from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
import { auroraToast, sonnerToast, ToastProps } from "@/client/components/NotificationCenter/AuroraToast"
import { DeleteImageModal } from "./DeleteImageModal"
import { CreateImageModal } from "./CreateImageModal"
import { Button } from "@cloudoperators/juno-ui-components/index"

interface ImagePageProps {
  images: GlanceImage[]
}

export function ImageListView({ images }: ImagePageProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

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
  const handleDelete = (updatedImage: GlanceImage) => {
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
  const handleEditImage = (image: GlanceImage) => {
    setSelectedImage(image)
    setEditModalOpen(true)
  }
  const handleCreateImage = () => {
    setCreateModalOpen(true)
  }

  const handleDeleteImage = (image: GlanceImage) => {
    setSelectedImage(image)
    setDeleteModalOpen(true)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-200">Images</h2>
        <Button onClick={handleCreateImage}>Add New Image</Button>
      </div>

      {/* Images Table */}
      {images.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-[#30363d] text-gray-300">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className="text-gray-400 border-b border-[#30363d]">
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
              {images.map((image, index) => (
                <ImageTableRow
                  image={image}
                  key={image.id}
                  onEdit={handleEditImage}
                  onDelete={handleDeleteImage}
                  isLast={index === images.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No images available.</p>
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
          onClose={() => setDeleteModalOpen(false)}
          image={selectedImage}
          onDelete={handleDelete}
        />
      )}

      <CreateImageModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={handleCreate} />
    </div>
  )
}

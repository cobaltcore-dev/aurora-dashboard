import type { GlanceImage } from "@/server/Compute/types/image"

import { useState } from "react"
import EditImageModal from "./EditImageModal"
import { ImageTableRow } from "./ImageTableRow"
import { auroraToast, sonnerToast, ToastProps } from "@/client/components/NotificationCenter/AuroraToast"

interface ImagePageProps {
  images: GlanceImage[]
}

export function ImageListView({ images }: ImagePageProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GlanceImage | null>(null)

  const handleSaveEdit = (updatedImage: GlanceImage) => {
    setEditModalOpen(false)
    const toastProps: Omit<ToastProps, "id"> = {
      title: "Image Instance",
      description: `Image instance "${updatedImage.name} || "Unnamed"}" has been updated`,
      variant: "success",
      button: {
        label: "Dismiss",
        onClick: () => sonnerToast.dismiss(),
      },
    }
    auroraToast(toastProps)
  }
  const handleEditImage = (image: GlanceImage) => {
    setSelectedImage(image)
    setEditModalOpen(true)
  }

  return (
    <div>
      {images && images.length > 0 ? (
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
                  onDelete={setSelectedImage}
                  isLast={index === images.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No images available.</p>
      )}
      {/* Modals */}
      {selectedImage && (
        <EditImageModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          image={selectedImage}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

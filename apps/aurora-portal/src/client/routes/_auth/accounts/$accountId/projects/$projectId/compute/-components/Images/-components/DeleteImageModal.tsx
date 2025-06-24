import React from "react"
import { GlanceImage } from "@/server/Compute/types/image"
import { Modal } from "@cloudoperators/juno-ui-components"
interface DeleteImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage
  onDelete: (updatedImage: GlanceImage) => void
}

export const DeleteImageModal: React.FC<DeleteImageModalProps> = ({ isOpen, onClose, image, onDelete }) => {
  if (!image) return null

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(image)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title="Delete Image"
      open={isOpen}
      onConfirm={(e) => {
        handleDelete(e)
        onClose()
      }}
      cancelButtonLabel="Cancel"
      confirmButtonLabel="Delete Image"
    >
      Are you sure you want to delete the image <strong>{image.name}</strong>? This action cannot be undone.
    </Modal>
  )
}

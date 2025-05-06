import React from "react"
import { Dialog, DialogTitle, DialogFooter } from "@/client/components/headless-ui/Dialog"
import { GlanceImage } from "@/server/Compute/types/image"
import { Button } from "@/client/components/headless-ui/Button"

interface DeleteImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage
  onSave: (updatedImage: GlanceImage) => void
}

export const DeleteImageModal: React.FC<DeleteImageModalProps> = ({ isOpen, onClose, image, onSave }) => {
  if (!image) return null

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onSave(image)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="text-xl font-semibold text-sap-grey-1">Delete Image</DialogTitle>
      <div className="flex items-center justify-between">
        <div className="mt-4">
          <p className="text-sap-grey-1">
            Are you sure you want to delete the image <strong>{image.name}</strong>? This action cannot be undone.
          </p>
        </div>
      </div>
      <DialogFooter className="flex space-x-3 mt-4 justify-end">
        <Button onClick={onClose} className={"bg-sap-grey-5 text-sap-grey-1 hover:bg-gray-800"}>
          Cancel
        </Button>
        <Button
          className={"bg-sap-orange-6 text-white hover:bg-red-600"}
          onClick={(e) => {
            onClose()
            handleDelete(e)
          }}
        >
          Delete Image
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

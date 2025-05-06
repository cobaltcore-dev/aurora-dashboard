import React, { useState } from "react"
import { Dialog, DialogTitle, DialogFooter } from "@/client/components/headless-ui/Dialog"
import { Label } from "@/client/components/headless-ui/Label"
import { Input } from "@/client/components/headless-ui/Input"
import { GlanceImage } from "@/server/Compute/types/image"
import clsx from "clsx"
import { FieldSet } from "@/client/components/headless-ui/FieldSet"
import { Select } from "@/client/components/headless-ui/Select"
import { Button } from "@/client/components/headless-ui/Button"
const textinputstyles = clsx(
  "mt-3 block w-full rounded-lg border-none bg-white/5 px-3 py-1.5 text-sm/6 text-white",
  "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
)
interface EditImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage
  onSave: (updatedImage: GlanceImage) => void
}

export const EditImageModal: React.FC<EditImageModalProps> = ({ isOpen, onClose, image, onSave }) => {
  const [editedImage, setEditedImage] = useState<GlanceImage>({ ...image })
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditedImage((prev: GlanceImage) => ({
      ...prev,
      [name]: value,
    }))
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(editedImage)
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="text-xl font-semibold text-sap-grey-1">Edit Image Details</DialogTitle>
      <FieldSet onSubmit={handleSubmit} className="space-y-4 py-3">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sap-grey-1 text-left">
              Image Name
            </Label>
            <Input
              id="name"
              name="name"
              value={editedImage.name!}
              onChange={handleChange}
              className={textinputstyles}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status" className="text-sap-grey-1 text-left">
              Status
            </Label>
            <Select
              id="status"
              name="status"
              value={editedImage.status}
              onChange={handleChange}
              className={textinputstyles}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="visibility" className="text-sap-grey-1 text-left">
              Visibility
            </Label>
            <Select
              id="visibility"
              name="visibility"
              value={editedImage.visibility}
              onChange={handleChange}
              className={textinputstyles}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="disk_format" className="text-sap-grey-1 text-left">
              Disk Format
            </Label>
            <Select
              id="disk_format"
              name="disk_format"
              value={editedImage.disk_format!}
              onChange={handleChange}
              className={textinputstyles}
            >
              <option value="qcow2">qcow2</option>
              <option value="raw">raw</option>
              <option value="vhd">vhd</option>
              <option value="vmdk">vmdk</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="os_type" className="text-sap-grey-1 text-left">
                OS Type
              </Label>
              <Input
                id="os_type"
                name="os_type"
                value={editedImage.os_type!}
                onChange={handleChange}
                className={textinputstyles}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="os_distro" className="text-sap-grey-1 text-left">
                OS Distribution
              </Label>
              <Input
                id="os_distro"
                name="os_distro"
                value={editedImage.os_distro || ""}
                onChange={handleChange}
                className={textinputstyles}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button onClick={onClose} className="bg-sap-grey-5 text-sap-grey-1 hover:bg-gray-800">
            Cancel
          </Button>
          <Button
            className="bg-sap-green text-sap-grey-2 hover:bg-red-600"
            onClick={(e) => {
              onClose()
              handleSubmit(e)
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </FieldSet>
    </Dialog>
  )
}

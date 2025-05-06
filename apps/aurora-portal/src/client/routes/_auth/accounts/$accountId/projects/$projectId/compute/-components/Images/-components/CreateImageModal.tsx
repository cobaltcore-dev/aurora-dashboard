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

// Default values for a new image
const defaultImageValues: Partial<GlanceImage> = {
  name: "",
  status: "active",
  visibility: "private",
  disk_format: "qcow2",
  os_type: "",
  os_distro: "",
  // Add any other required default fields
}

interface CreateImageModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (newImage: Partial<GlanceImage>) => void
}

export const CreateImageModal: React.FC<CreateImageModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [newImage, setNewImage] = useState<Partial<GlanceImage>>({ ...defaultImageValues })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewImage((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(newImage)
  }

  // Reset form when modal closes
  const handleClose = () => {
    setNewImage({ ...defaultImageValues })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTitle className="text-xl font-semibold text-sap-grey-1">Create New Image</DialogTitle>
      <FieldSet onSubmit={handleSubmit} className="space-y-4 py-3">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sap-grey-1 text-left">
              Image Name
            </Label>
            <Input
              id="name"
              name="name"
              value={newImage.name || ""}
              onChange={handleChange}
              className={textinputstyles}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status" className="text-sap-grey-1 text-left">
              Status
            </Label>
            <Select
              id="status"
              name="status"
              value={newImage.status || "active"}
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
              value={newImage.visibility || "private"}
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
              value={newImage.disk_format || "qcow2"}
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
                value={newImage.os_type || ""}
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
                value={newImage.os_distro || ""}
                onChange={handleChange}
                className={textinputstyles}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image_source" className="text-sap-grey-1 text-left">
              Image Source
            </Label>
            <Select
              id="image_source"
              name="image_source"
              value={newImage.file || "url"}
              onChange={handleChange}
              className={textinputstyles}
            >
              <option value="url">URL</option>
              <option value="upload">Upload</option>
              <option value="snapshot">Snapshot</option>
            </Select>
          </div>

          {newImage.direct_url === "url" && (
            <div className="grid gap-2">
              <Label htmlFor="image_url" className="text-sap-grey-1 text-left">
                Image URL
              </Label>
              <Input
                id="image_url"
                name="image_url"
                value={newImage.direct_url || ""}
                onChange={handleChange}
                className={textinputstyles}
                placeholder="https://"
                required
              />
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button onClick={handleClose} className="bg-sap-grey-5 text-sap-grey-1 hover:bg-gray-800">
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={(e) => {
              onClose()
              handleSubmit(e)
            }}
            className="bg-sap-green text-sap-grey-2 hover:bg-green-700"
          >
            Create Image
          </Button>
        </DialogFooter>
      </FieldSet>
    </Dialog>
  )
}

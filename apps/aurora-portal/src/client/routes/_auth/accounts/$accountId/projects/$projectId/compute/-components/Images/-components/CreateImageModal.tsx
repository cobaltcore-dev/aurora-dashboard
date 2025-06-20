import React, { useState } from "react"

import {
  Modal,
  Form,
  FormRow,
  TextInput,
  Select,
  SelectOption,
  FormSection,
} from "@cloudoperators/juno-ui-components/index"
import { GlanceImage } from "@/server/Compute/types/image"

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewImage((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string | number | string[] | undefined) => {
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
    <Modal
      onCancel={handleClose}
      size="large"
      title="Create New Image"
      open={isOpen}
      onConfirm={(e) => {
        handleSubmit(e)
        onClose()
      }}
      cancelButtonLabel="Cancel"
      confirmButtonLabel="Create Image"
    >
      <Form>
        <FormSection>
          <FormRow>
            <TextInput
              id="name"
              name="name"
              label="Image Name"
              value={newImage.name || ""}
              onChange={handleInputChange}
              required
            />
          </FormRow>
          <FormRow>
            <Select
              id="status"
              name="status"
              label="Status"
              onChange={(value) => handleSelectChange("status", value)}
              value={newImage.status || "active"}
            >
              <SelectOption value="active" label="Active" />
              <SelectOption value="inactive" label="Inactive" />
              <SelectOption value="pending" label="Pending" />
              <SelectOption value="error" label="Error" />
            </Select>
          </FormRow>

          <FormRow>
            <Select
              id="visibility"
              name="visibility"
              label="Visibility"
              value={newImage.visibility || "private"}
              onChange={(value) => handleSelectChange("visibility", value)}
            >
              <SelectOption value="public" label="Public" />
              <SelectOption value="private" label="Private" />
              <SelectOption value="shared" label="Shared" />
            </Select>
          </FormRow>
          <FormRow>
            <Select
              id="disk_format"
              name="disk_format"
              label="Disk Format"
              value={newImage.disk_format || "qcow2"}
              onChange={(value) => handleSelectChange("disk_format", value)}
            >
              <SelectOption value="qcow2" label="qcow2" />
              <SelectOption value="raw" label="raw" />
              <SelectOption value="vhd" label="vhd" />
              <SelectOption value="vmdk" label="vmdk" />
            </Select>
          </FormRow>
        </FormSection>
        <FormSection>
          <FormRow>
            <TextInput
              id="os_type"
              name="os_type"
              label="OS Type"
              value={newImage.os_type || ""}
              onChange={handleInputChange}
            />
          </FormRow>
          <FormRow>
            <TextInput
              label="OS Distribution"
              id="os_distro"
              name="os_distro"
              value={newImage.os_distro || ""}
              onChange={handleInputChange}
            />
          </FormRow>
        </FormSection>
        <FormSection>
          <FormRow>
            <Select
              id="image_source"
              name="file"
              label="Image Source"
              value={newImage.file || ""}
              onChange={(value) => handleSelectChange("file", value)}
            >
              <SelectOption value="url" label="URL" />
              <SelectOption value="upload" label="Upload" />
              <SelectOption value="snapshot" label="Snapshot" />
            </Select>
          </FormRow>
          {newImage.file === "url" && (
            <FormRow>
              <TextInput
                id="image_url"
                name="image_url"
                label="Image URL"
                value={newImage.direct_url || ""}
                onChange={handleInputChange}
                placeholder="https://"
                required
              />
            </FormRow>
          )}
        </FormSection>
      </Form>
    </Modal>
  )
}

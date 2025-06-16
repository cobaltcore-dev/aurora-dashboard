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
interface EditImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage
  onSave: (updatedImage: GlanceImage) => void
}

export const EditImageModal: React.FC<EditImageModalProps> = ({ isOpen, onClose, image, onSave }) => {
  const [editedImage, setEditedImage] = useState<GlanceImage>({ ...image })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditedImage((prev: GlanceImage) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string | number | string[] | undefined) => {
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
    <Modal
      open={isOpen}
      onCancel={onClose}
      size="large"
      title="Create New Image"
      onConfirm={(e) => {
        onClose()
        handleSubmit(e)
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
              value={editedImage.name!}
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
              value={editedImage.status}
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
              value={editedImage.visibility}
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
              value={editedImage.disk_format || "qcow2"}
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
              value={editedImage.os_type!}
              onChange={handleInputChange}
            />
          </FormRow>
          <FormRow>
            <TextInput
              label="OS Distribution"
              id="os_distro"
              name="os_distro"
              value={editedImage.os_distro || ""}
              onChange={handleInputChange}
            />
          </FormRow>
        </FormSection>
      </Form>
    </Modal>
  )
}

import React, { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Select,
  SelectOption,
  Checkbox,
  Button,
  ButtonRow,
  Message,
  Spinner,
  Stack,
  ModalFooter,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

interface EditImageDetailsModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onSave: (updatedProperties: Partial<GlanceImage>) => void
}

interface ImageProperties {
  name: string
  tags: string[]
  visibility: string
  protected: boolean
  min_disk: number
  min_ram: number
}

export const EditImageDetailsModal: React.FC<EditImageDetailsModalProps> = ({
  image,
  isOpen,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { t } = useLingui()

  // Initialize local state from image prop
  const [properties, setProperties] = useState<ImageProperties>({
    name: image.name || "",
    tags: image.tags || [],
    visibility: image.visibility || "private",
    protected: image.protected || false,
    min_disk: image.min_disk || 0,
    min_ram: image.min_ram || 0,
  })

  const [tagsInput, setTagsInput] = useState<string>(image.tags?.join(", ") || "")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setProperties((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string | number | string[] | undefined) => {
    setProperties((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleNumericChange = (name: string, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10)

    if (!isNaN(numValue)) {
      setProperties((prev) => ({
        ...prev,
        [name]: numValue,
      }))

      // Clear error for this field
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    }
  }

  const handleTagsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTagsInput(value)

    // Parse tags from comma-separated string
    const parsedTags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    setProperties((prev) => ({
      ...prev,
      tags: parsedTags,
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!properties.name || properties.name.trim() === "") {
      newErrors.name = t`Image name is required`
    }

    if (properties.min_disk < 0) {
      newErrors.min_disk = t`Minimum disk must be 0 or greater`
    }

    if (properties.min_ram < 0) {
      newErrors.min_ram = t`Minimum RAM must be 0 or greater`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Prepare updated properties
    const updatedProperties: Partial<GlanceImage> = {
      name: properties.name.trim(),
      tags: properties.tags,
      visibility: properties.visibility,
      protected: properties.protected,
      min_disk: properties.min_disk,
      min_ram: properties.min_ram,
    }

    onSave(updatedProperties)
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="large"
      title={t`Edit Image Details`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isLoading}
              data-testid="save-image-updates-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Save Changes</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}

      {!isLoading && (
        <Form>
          {/* Basic Metadata Section */}
          <FormSection className="mb-6">
            <FormRow className="mb-4">
              <TextInput
                id="name"
                name="name"
                label={t`Image Name`}
                value={properties.name}
                onChange={handleInputChange}
                required
                errortext={errors.name}
              />
            </FormRow>

            <FormRow className="mb-4">
              <TextInput
                id="tags"
                name="tags"
                label={t`Tags`}
                value={tagsInput}
                onChange={handleTagsInputChange}
                helptext={t`Enter tags separated by commas (e.g., production, linux, ubuntu)`}
              />
            </FormRow>

            <FormRow className="mb-4">
              <Select
                id="visibility"
                name="visibility"
                label={t`Visibility`}
                value={properties.visibility}
                onChange={(value) => handleSelectChange("visibility", value)}
              >
                <SelectOption value="public" label={t`Public`} />
                <SelectOption value="private" label={t`Private`} />
                <SelectOption value="shared" label={t`Shared`} />
                <SelectOption value="community" label={t`Community`} />
              </Select>
            </FormRow>

            <FormRow>
              <Checkbox
                id="protected"
                name="protected"
                label={t`Protected`}
                checked={properties.protected}
                onChange={handleInputChange}
                helptext={t`Protect this image from being deleted`}
              />
            </FormRow>
          </FormSection>

          {/* Resource Requirements Section */}
          <FormSection className="mb-6">
            <FormRow className="mb-4">
              <TextInput
                id="min_disk"
                name="min_disk"
                label={t`Minimum Disk (GB)`}
                type="number"
                value={String(properties.min_disk)}
                onChange={(e) => handleNumericChange("min_disk", e.target.value)}
                helptext={t`Minimum disk size required to boot this image`}
                errortext={errors.min_disk}
                // min={0}
              />
            </FormRow>

            <FormRow>
              <TextInput
                id="min_ram"
                name="min_ram"
                label={t`Minimum RAM (MB)`}
                type="number"
                value={String(properties.min_ram)}
                onChange={(e) => handleNumericChange("min_ram", e.target.value)}
                helptext={t`Minimum RAM required to boot this image`}
                errortext={errors.min_ram}
                // min={0}
              />
            </FormRow>
          </FormSection>

          {/* Info Notice */}
          <Message
            text={t`Changes to these properties will affect how this image can be used and who can access it.`}
            variant="info"
            className="mt-4"
          />
        </Form>
      )}
    </Modal>
  )
}

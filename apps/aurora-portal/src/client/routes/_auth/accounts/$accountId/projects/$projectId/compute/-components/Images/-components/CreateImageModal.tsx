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
  Spinner,
  Stack,
  ModalFooter,
  Pill,
} from "@cloudoperators/juno-ui-components"
import { CreateImageInput } from "@/server/Compute/types/image"

interface CreateImageModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (imageData: CreateImageInput, file: File) => Promise<void>
  isLoading?: boolean
}

interface ImageProperties {
  name: string
  tags: string[]
  visibility: string
  disk_format: string
  protected: boolean
  min_disk: number
  min_ram: number
  os_type: string
  os_distro: string
}

const defaultImageValues: ImageProperties = {
  name: "",
  tags: [],
  visibility: "private",
  disk_format: "qcow2",
  protected: false,
  min_disk: 0,
  min_ram: 0,
  os_type: "",
  os_distro: "",
}

export const CreateImageModal: React.FC<CreateImageModalProps> = ({ isOpen, onClose, onCreate, isLoading = false }) => {
  const { t } = useLingui()

  const [properties, setProperties] = useState<ImageProperties>({ ...defaultImageValues })
  const [tagsInput, setTagsInput] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const isSubmitDisabled = !properties.name.trim() || !selectedFile || isLoading

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setProperties((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

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

      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (errors.file) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.file
          return newErrors
        })
      }
    }
  }

  const handleTagsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value)
  }

  const handleAddTag = () => {
    const trimmedTag = tagsInput.trim()

    if (trimmedTag === "") return

    if (properties.tags.includes(trimmedTag)) {
      setTagsInput("")
      return
    }

    setProperties((prev) => ({
      ...prev,
      tags: [...prev.tags, trimmedTag],
    }))

    setTagsInput("")
  }

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setProperties((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!properties.name || properties.name.trim() === "") {
      newErrors.name = t`Image name is required`
    }

    if (!selectedFile) {
      newErrors.file = t`Image file is required`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Prepare image data without the file (file is uploaded separately)
    const imageData = {
      name: properties.name.trim(),
      tags: properties.tags,
      visibility: properties.visibility,
      disk_format: properties.disk_format,
      protected: properties.protected,
      min_disk: properties.min_disk,
      min_ram: properties.min_ram,
      os_type: properties.os_type.trim() || undefined,
      os_distro: properties.os_distro.trim() || undefined,
    } as CreateImageInput

    // Call onCreate with imageData and file as separate arguments
    // File will be uploaded after image is created
    await onCreate(imageData, selectedFile!)
    handleClose()
  }

  const handleClose = () => {
    setProperties({ ...defaultImageValues })
    setTagsInput("")
    setSelectedFile(null)
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="large"
      title={t`Create New Image`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isSubmitDisabled || isLoading}
              data-testid="create-image-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Create Image</Trans>}
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
        <Form className="mb-6">
          {/* File Upload Section */}
          <FormSection className="mb-6">
            <FormRow>
              <div className="w-full">
                <label htmlFor="image-file" className="block text-sm font-medium text-gray-900 mb-2">
                  {t`Image File`}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image-file"
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <svg
                        className="w-6 h-6 mb-1 text-gray-500"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 5.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">{t`Click to upload`}</span> {t`or drag and drop`}
                      </p>
                      <p className="text-xs text-gray-400">{t`QCOW2, Raw, VMDK, VHD, VHDX, VDI, AMI, ARI, AKI, ISO, PLOOP`}</p>
                    </div>
                    <input
                      id="image-file"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".qcow2,.raw,.vmdk,.vhd,.vhdx,.vdi,.ami,.ari,.aki,.iso,.ploop,.img"
                      disabled={isLoading}
                    />
                  </label>
                </div>
                {selectedFile && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{selectedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-600 hover:text-red-800 font-medium"
                      disabled={isLoading}
                    >
                      {t`Remove`}
                    </button>
                  </div>
                )}
                {errors.file && <p className="text-red-600 text-xs mt-1">{errors.file}</p>}
              </div>
            </FormRow>
          </FormSection>

          {/* Basic Details Section */}
          <FormSection className="mb-6">
            <FormRow className="mb-6">
              <TextInput
                id="name"
                name="name"
                label={t`Image Name`}
                value={properties.name}
                onChange={handleInputChange}
                required
                errortext={errors.name}
                placeholder={t`Ubuntu 22.04 LTS`}
                disabled={isLoading}
              />
            </FormRow>

            <FormRow className="mb-6">
              <div className="w-full">
                <Stack gap="1" direction="horizontal" alignment="start">
                  <div className="flex-1">
                    <TextInput
                      id="tags"
                      name="tags"
                      label={t`Tags`}
                      value={tagsInput}
                      onChange={handleTagsInputChange}
                      onKeyDown={handleTagKeyPress}
                      helptext={t`Press Enter to add`}
                      placeholder={t`production, linux`}
                      disabled={isLoading}
                    />
                  </div>

                  <Button variant="primary" onClick={handleAddTag} disabled={isLoading || tagsInput.trim() === ""}>
                    <Trans>Add</Trans>
                  </Button>
                </Stack>

                {properties.tags.length > 0 && (
                  <Stack gap="1" wrap={true} alignment="center" className="mt-1">
                    {properties.tags.map((tag) => (
                      <Pill key={tag} closeable pillKey="" pillValue={tag} onClose={() => handleRemoveTag(tag)} />
                    ))}
                  </Stack>
                )}
              </div>
            </FormRow>

            <FormRow className="mb-6">
              <Select
                id="visibility"
                name="visibility"
                label={t`Visibility`}
                value={properties.visibility}
                onChange={(value) => handleSelectChange("visibility", value)}
                disabled={isLoading}
                loading={isLoading}
              >
                <SelectOption value="public" label={t`Public`} />
                <SelectOption value="private" label={t`Private`} />
                <SelectOption value="shared" label={t`Shared`} />
                <SelectOption value="community" label={t`Community`} />
              </Select>
            </FormRow>

            <FormRow className="mb-6">
              <Select
                id="disk_format"
                name="disk_format"
                label={t`Disk Format`}
                value={properties.disk_format}
                onChange={(value) => handleSelectChange("disk_format", value)}
                disabled={isLoading}
                loading={isLoading}
              >
                <SelectOption value="qcow2" label="QCOW2 - QEMU Emulator" />
                <SelectOption value="raw" label="Raw" />
                <SelectOption value="vmdk" label="VMDK - Virtual Machine Disk" />
                <SelectOption value="vhd" label="VHD - Virtual Hard Disk" />
                <SelectOption value="vhdx" label="VHDX - Virtual Hard Disk Extended" />
                <SelectOption value="vdi" label="VDI - Virtual Disk Image" />
                <SelectOption value="ami" label="AMI - Amazon Machine Image" />
                <SelectOption value="ari" label="ARI - Amazon Ramdisk Image" />
                <SelectOption value="aki" label="AKI - Amazon Kernel Image" />
                <SelectOption value="iso" label="ISO - Optical Disk Image" />
                <SelectOption value="ploop" label="PLOOP - Virtuozzo/Parallels Loopback Disk" />
              </Select>
            </FormRow>

            <FormRow className="mb-0">
              <Checkbox
                id="protected"
                name="protected"
                label={t`Protected`}
                checked={properties.protected}
                onChange={handleInputChange}
                helptext={t`Prevent accidental deletion`}
                disabled={isLoading}
              />
            </FormRow>
          </FormSection>

          {/* Operating System Section */}
          <FormSection className="mb-6">
            <FormRow className="mb-6">
              <Stack direction="horizontal" gap="3" distribution="evenly" className="w-full">
                <div className="flex-1">
                  <TextInput
                    id="os_type"
                    name="os_type"
                    label={t`OS Type`}
                    value={properties.os_type}
                    onChange={handleInputChange}
                    placeholder={t`Linux, Windows`}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <TextInput
                    id="os_distro"
                    name="os_distro"
                    label={t`OS Distribution`}
                    value={properties.os_distro}
                    onChange={handleInputChange}
                    placeholder={t`Ubuntu, CentOS`}
                    disabled={isLoading}
                  />
                </div>
              </Stack>
            </FormRow>
          </FormSection>

          {/* Resource Requirements Section */}
          <FormSection className="mb-6">
            <FormRow className="mb-0">
              <Stack direction="horizontal" gap="3" distribution="evenly" className="w-full">
                <div className="flex-1">
                  <TextInput
                    id="min_disk"
                    name="min_disk"
                    label={t`Min Disk (GB)`}
                    type="number"
                    value={String(properties.min_disk)}
                    onChange={(e) => handleNumericChange("min_disk", e.target.value)}
                    helptext={t`Boot size`}
                    errortext={errors.min_disk}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <TextInput
                    id="min_ram"
                    name="min_ram"
                    label={t`Min RAM (MB)`}
                    type="number"
                    value={String(properties.min_ram)}
                    onChange={(e) => handleNumericChange("min_ram", e.target.value)}
                    helptext={t`Boot RAM`}
                    errortext={errors.min_ram}
                    disabled={isLoading}
                  />
                </div>
              </Stack>
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

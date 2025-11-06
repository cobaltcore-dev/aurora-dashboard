import React, { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Button,
  ButtonRow,
  Message,
  Spinner,
  Stack,
  ModalFooter,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  TextInput,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

interface EditImageMetadataModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onSave: (metadata: Record<string, string>) => void
}

// Properties that should be excluded from metadata editing
const EXCLUDED_PROPERTIES = new Set([
  // Basic metadata (managed by separate modal)
  "name",
  "tags",
  "visibility",
  "protected",
  "min_disk",
  "min_ram",
  // Immutable properties
  "id",
  "status",
  "size",
  "checksum",
  "created_at",
  "updated_at",
  "created-at",
  "updated-at",
  "disk_format",
  "container_format",
  "file",
  "schema",
  "locations",
  "self",
  "direct_url",
  "owner",
  "virtual_size",
  "kernel_id",
  "ramdisk_id",
  // Hash and integrity properties
  "os_hash_algo",
  "os_hash_value",
  "os-hash-algo",
  "os-hash-value",
  // Backend and storage properties
  "stores",
  "owner_specified.openstack.md5",
  "owner_specified.openstack.sha256",
  "owner_specified.openstack.object",
])

interface MetadataEntry {
  key: string
  value: string
  isNew?: boolean
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

export const EditImageMetadataModal: React.FC<EditImageMetadataModalProps> = ({
  image,
  isOpen,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { t } = useLingui()

  // Extract dynamic metadata from image, excluding reserved properties
  const getInitialMetadata = (): MetadataEntry[] => {
    const entries: MetadataEntry[] = []

    // Get all properties from the image
    Object.entries(image).forEach(([key, value]) => {
      // Skip excluded properties and non-string values
      if (!EXCLUDED_PROPERTIES.has(key) && typeof value === "string") {
        entries.push({
          key,
          value,
          isNew: false,
          isEditing: false,
          originalKey: key,
          originalValue: value,
        })
      }
    })

    return entries
  }

  const [metadata, setMetadata] = useState<MetadataEntry[]>(getInitialMetadata())
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const isSubmitDisabled = metadata.every(
    (entry) => !entry.isNew && entry.key === entry.originalKey && entry.value === entry.originalValue
  )

  const validateKey = (key: string, originalKey?: string): string | null => {
    if (!key || key.trim() === "") {
      return t`Key is required`
    }

    if (EXCLUDED_PROPERTIES.has(key.toLowerCase())) {
      return t`This property is reserved and cannot be modified`
    }

    // Check for duplicate keys (excluding the current entry being edited)
    const isDuplicate = metadata.some(
      (entry) => entry.key.toLowerCase() === key.toLowerCase() && entry.originalKey !== originalKey
    )

    if (isDuplicate) {
      return t`A property with this key already exists`
    }

    return null
  }

  const handleAddNew = () => {
    const keyError = validateKey(newKey)

    if (keyError) {
      setErrors({ newKey: keyError })
      return
    }

    if (!newValue.trim()) {
      setErrors({ newValue: t`Value is required` })
      return
    }

    setMetadata([
      ...metadata,
      {
        key: newKey.trim(),
        value: newValue.trim(),
        isNew: true,
        isEditing: false,
        originalKey: newKey.trim(),
        originalValue: newValue.trim(),
      },
    ])

    setNewKey("")
    setNewValue("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleCancelAdd = () => {
    setNewKey("")
    setNewValue("")
    setIsAddingNew(false)
    setErrors({})
  }

  const handleEdit = (index: number) => {
    setMetadata(
      metadata.map((entry, i) =>
        i === index ? { ...entry, isEditing: true, originalValue: entry.value } : { ...entry, isEditing: false }
      )
    )
    setIsAddingNew(false)
  }

  const handleSaveEdit = (index: number) => {
    const entry = metadata[index]
    const keyError = validateKey(entry.key, entry.originalKey)

    if (keyError) {
      setErrors({ [`edit-${index}`]: keyError })
      return
    }

    if (!entry.value.trim()) {
      setErrors({ [`edit-${index}`]: t`Value is required` })
      return
    }

    setMetadata(
      metadata.map((e, i) => (i === index ? { ...e, isEditing: false, key: e.key.trim(), value: e.value.trim() } : e))
    )
    setErrors({})
  }

  const handleCancelEdit = (index: number) => {
    setMetadata(
      metadata.map((e, i) =>
        i === index
          ? {
              ...e,
              isEditing: false,
              key: e.originalKey || e.key,
              value: e.originalValue || e.value,
            }
          : e
      )
    )
    setErrors({})
  }

  const handleDelete = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index))
    setErrors({})
  }

  const handleKeyChange = (index: number, value: string) => {
    setMetadata(metadata.map((entry, i) => (i === index ? { ...entry, key: value } : entry)))
    // Clear error for this field
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`edit-${index}`]
        return newErrors
      })
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setMetadata(metadata.map((entry, i) => (i === index ? { ...entry, value } : entry)))
    // Clear error for this field
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`edit-${index}`]
        return newErrors
      })
    }
  }

  const handleSubmit = () => {
    // Convert metadata array to object
    const metadataObject: Record<string, string> = {}
    metadata
      // Exclude entries without updates (new added or edited)
      .filter((entry) => entry.isNew || entry.value !== entry.originalValue || entry.key !== entry.originalKey)
      .forEach((entry) => {
        metadataObject[entry.key] = entry.value
      })

    onSave(metadataObject)
    handleClose()
  }

  const handleClose = () => {
    setMetadata(getInitialMetadata())
    setIsAddingNew(false)
    setNewKey("")
    setNewValue("")
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="large"
      title={t`Edit Image Metadata`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading || isAddingNew || metadata.some((e) => e.isEditing) || isSubmitDisabled}
              data-testid="save-metadata-button"
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
        <div>
          {/* Info Message */}
          <Message
            text={t`Custom metadata properties can be used to store additional information about this image. Reserved properties cannot be modified here.`}
            variant="info"
            className="mb-6"
          />

          {/* Add New Button */}
          <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 justify-end p-2 mb-4">
            <Button
              label={t`Add Property`}
              onClick={() => setIsAddingNew(true)}
              variant="primary"
              disabled={isAddingNew || metadata.some((e) => e.isEditing)}
              icon="addCircle"
            />
          </Stack>

          {/* Metadata Table */}
          <DataGrid columns={3} className="mb-6">
            <DataGridRow>
              <DataGridHeadCell>{t`Property Key`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Actions`}</DataGridHeadCell>
            </DataGridRow>

            {/* Add New Row */}
            {isAddingNew && (
              <DataGridRow>
                <DataGridCell>
                  <TextInput
                    value={newKey}
                    onChange={(e) => {
                      setNewKey(e.target.value)
                      if (errors.newKey) {
                        setErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.newKey
                          return newErrors
                        })
                      }
                    }}
                    placeholder={t`property_key`}
                    errortext={errors.newKey}
                    autoFocus
                  />
                </DataGridCell>
                <DataGridCell>
                  <TextInput
                    value={newValue}
                    onChange={(e) => {
                      setNewValue(e.target.value)
                      if (errors.newValue) {
                        setErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.newValue
                          return newErrors
                        })
                      }
                    }}
                    placeholder={t`Value`}
                    errortext={errors.newValue}
                  />
                </DataGridCell>
                <DataGridCell>
                  <Stack direction="horizontal" gap="2">
                    <Button size="small" variant="primary" onClick={handleAddNew} icon="check" title={t`Save`} />
                    <Button size="small" variant="subdued" onClick={handleCancelAdd} icon="close" title={t`Discard`} />
                  </Stack>
                </DataGridCell>
              </DataGridRow>
            )}

            {/* Existing Metadata Rows */}
            {metadata.map((entry, index) => (
              <DataGridRow key={`${entry.originalKey}-${index}`}>
                <DataGridCell>
                  {entry.isEditing ? (
                    <TextInput
                      value={entry.key}
                      onChange={(e) => handleKeyChange(index, e.target.value)}
                      errortext={errors[`edit-${index}`]}
                    />
                  ) : (
                    <span className="jn:text-theme-high font-mono block truncate max-w-xs" title={entry.key}>
                      {entry.key}
                    </span>
                  )}
                </DataGridCell>
                <DataGridCell>
                  {entry.isEditing ? (
                    <TextInput value={entry.value} onChange={(e) => handleValueChange(index, e.target.value)} />
                  ) : (
                    <span className="jn:text-theme-default block truncate max-w-md" title={entry.value}>
                      {entry.value}
                    </span>
                  )}
                </DataGridCell>
                <DataGridCell>
                  {entry.isEditing ? (
                    <Stack direction="horizontal" gap="2">
                      <Button
                        size="small"
                        variant="primary"
                        onClick={() => handleSaveEdit(index)}
                        icon="check"
                        title={t`Save`}
                      />
                      <Button
                        size="small"
                        variant="subdued"
                        onClick={() => handleCancelEdit(index)}
                        icon="close"
                        title={t`Discard`}
                      />
                    </Stack>
                  ) : (
                    <Stack direction="horizontal" gap="2">
                      <Button
                        size="small"
                        variant="subdued"
                        onClick={() => handleEdit(index)}
                        icon="edit"
                        data-testid={`edit-${entry.key}`}
                        title={t`Edit`}
                        disabled={isAddingNew || metadata.some((e) => e.isEditing)}
                      />
                      <Button
                        size="small"
                        variant="primary-danger"
                        onClick={() => handleDelete(index)}
                        icon="deleteForever"
                        data-testid={`delete-${entry.key}`}
                        title={t`Delete`}
                        disabled={isAddingNew || metadata.some((e) => e.isEditing)}
                      />
                    </Stack>
                  )}
                </DataGridCell>
              </DataGridRow>
            ))}

            {/* Empty State */}
            {metadata.length === 0 && !isAddingNew && (
              <DataGridRow>
                <DataGridCell colSpan={3} className="text-center py-8 jn:text-theme-light">
                  <Stack alignment="center">
                    <span>{t`No custom metadata properties found. Click "Add Property" to create one.`}</span>
                  </Stack>
                </DataGridCell>
              </DataGridRow>
            )}
          </DataGrid>

          {/* Warning Message */}
          {metadata.length > 0 && (
            <Message
              text={t`Changes to metadata will be saved when you click "Save Changes". Make sure all properties are correctly configured before saving.`}
              variant="warning"
            />
          )}
        </div>
      )}
    </Modal>
  )
}

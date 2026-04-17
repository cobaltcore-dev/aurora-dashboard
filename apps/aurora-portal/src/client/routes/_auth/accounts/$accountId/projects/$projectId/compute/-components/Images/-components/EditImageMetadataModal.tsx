import React, { useState, useEffect, useMemo } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Button,
  Spinner,
  Stack,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  TextInput,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"
import { trpcReact } from "@/client/trpcClient"

interface EditImageMetadataModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onSave: (metadata: Record<string, string | null>) => Promise<void> | void
}

interface MetadataEntry {
  key: string
  value: string
  isNew?: boolean
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

function toStrValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function buildInitialMetadata(image: GlanceImage, excludedProperties: Set<string>): MetadataEntry[] {
  return Object.entries(image)
    .filter(([key]) => !excludedProperties.has(key))
    .map(([key, value]) => {
      const strValue = toStrValue(value)
      return { key, value: strValue, isNew: false, isEditing: false, originalKey: key, originalValue: strValue }
    })
}

// Inner component receives already-computed initialMetadata so useState is seeded correctly
function EditImageMetadataModalInner({
  isLoading,
  onClose,
  onSave,
  initialMetadata,
  excludedProperties,
}: {
  isLoading: boolean
  onClose: () => void
  onSave: (metadata: Record<string, string | null>) => Promise<void> | void
  initialMetadata: MetadataEntry[]
  excludedProperties: Set<string>
}) {
  const { t } = useLingui()

  const [metadata, setMetadata] = useState<MetadataEntry[]>(initialMetadata)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)

  useEffect(() => {
    if (confirmDeleteIndex !== null) {
      const timer = setTimeout(() => setConfirmDeleteIndex(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmDeleteIndex])

  const isSubmitDisabled =
    metadata.every((entry) => !entry.isNew && entry.key === entry.originalKey && entry.value === entry.originalValue) &&
    initialMetadata.length === metadata.length

  const validateKey = (key: string, originalKey?: string): string | null => {
    const normalized = key?.trim()
    if (!normalized) {
      return t`Key is required`
    }
    if (excludedProperties.has(normalized)) {
      return t`This property is reserved and cannot be modified`
    }
    const isDuplicate = metadata.some((entry) => entry.key.trim() === normalized && entry.originalKey !== originalKey)
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
    setMetadata([...metadata, { key: newKey.trim(), value: newValue.trim(), isNew: true, isEditing: false }])
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
    setConfirmDeleteIndex(null)
    setMetadata(
      metadata.map((entry, i) => (i === index ? { ...entry, isEditing: true } : { ...entry, isEditing: false }))
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
        i === index ? { ...e, isEditing: false, key: e.originalKey ?? e.key, value: e.originalValue ?? e.value } : e
      )
    )
    setErrors({})
  }

  const handleDelete = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index))
    setConfirmDeleteIndex(null)
    setErrors({})
  }

  const handleKeyChange = (index: number, value: string) => {
    setMetadata(metadata.map((entry, i) => (i === index ? { ...entry, key: value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setMetadata(metadata.map((entry, i) => (i === index ? { ...entry, value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
    }
  }

  const handleSubmit = async () => {
    const metadataObject: Record<string, string> = {}
    const removedEntries = Object.fromEntries(
      initialMetadata
        .filter(
          (entry) =>
            !metadata.map((item) => item.originalKey).includes(entry.originalKey) ||
            !metadata.map((item) => item.key).includes(entry.key)
        )
        .map((entry) => [entry.key, null])
    )
    metadata
      .filter((entry) => entry.isNew || entry.value !== entry.originalValue || entry.key !== entry.originalKey)
      .forEach((entry) => {
        metadataObject[entry.key] = entry.value
      })
    await onSave({ ...metadataObject, ...removedEntries })
    onClose()
  }

  const handleClose = () => {
    setMetadata(initialMetadata)
    setIsAddingNew(false)
    setNewKey("")
    setNewValue("")
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open
      onCancel={handleClose}
      size="large"
      title={t`Edit Image Metadata`}
      onConfirm={handleSubmit}
      confirmButtonLabel={t`Save Changes`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isLoading || isAddingNew || metadata.some((e) => e.isEditing) || isSubmitDisabled}
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}

      {!isLoading && (
        <div>
          <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 mb-4 justify-end p-2">
            <Button
              label={t`Add Property`}
              onClick={() => setIsAddingNew(true)}
              variant="primary"
              disabled={isAddingNew || metadata.some((e) => e.isEditing)}
              icon="addCircle"
            />
          </Stack>

          <DataGrid columns={3} minContentColumns={[2]} className="mb-6">
            <DataGridRow>
              <DataGridHeadCell>{t`Property Key`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
              <DataGridHeadCell></DataGridHeadCell>
            </DataGridRow>

            {isAddingNew && (
              <DataGridRow>
                <DataGridCell>
                  <TextInput
                    value={newKey}
                    onChange={(e) => {
                      setNewKey(e.target.value)
                      if (errors.newKey) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.newKey
                          return next
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
                          const next = { ...prev }
                          delete next.newValue
                          return next
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
                    <span className="jn:text-theme-high block max-w-xs truncate font-mono" title={entry.key}>
                      {entry.key}
                    </span>
                  )}
                </DataGridCell>
                <DataGridCell>
                  {entry.isEditing ? (
                    <TextInput value={entry.value} onChange={(e) => handleValueChange(index, e.target.value)} />
                  ) : (
                    <span className="jn:text-theme-default block max-w-md truncate" title={entry.value}>
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
                      {confirmDeleteIndex !== index && (
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={() => handleEdit(index)}
                          icon="edit"
                          data-testid={`edit-${entry.key}`}
                          title={t`Edit`}
                          disabled={isAddingNew || metadata.some((e) => e.isEditing)}
                        />
                      )}
                      {confirmDeleteIndex === index ? (
                        <Button
                          size="small"
                          variant="primary-danger"
                          onClick={() => handleDelete(index)}
                          data-testid={`confirm-delete-${entry.key}`}
                          title={t`Delete`}
                          disabled={isAddingNew || metadata.some((e) => e.isEditing)}
                        >
                          {t`Delete`}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => setConfirmDeleteIndex(index)}
                          icon="deleteForever"
                          data-testid={`delete-${entry.key}`}
                          title={t`Delete`}
                          disabled={isAddingNew || metadata.some((e) => e.isEditing)}
                        />
                      )}
                    </Stack>
                  )}
                </DataGridCell>
              </DataGridRow>
            ))}

            {metadata.length === 0 && !isAddingNew && (
              <DataGridRow>
                <DataGridCell colSpan={3} className="jn:text-theme-light py-8 text-center">
                  <Stack alignment="center">
                    <span>{t`No custom metadata properties found. Click "Add Property" to create one.`}</span>
                  </Stack>
                </DataGridCell>
              </DataGridRow>
            )}
          </DataGrid>
        </div>
      )}
    </Modal>
  )
}

export const EditImageMetadataModal: React.FC<EditImageMetadataModalProps> = ({
  image,
  isOpen,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { data: excludedPropertiesData } = trpcReact.compute.getImageMetadataExcludedProperties.useQuery(undefined, {
    enabled: isOpen,
  })
  const excludedProperties = useMemo(() => new Set(excludedPropertiesData ?? []), [excludedPropertiesData])
  const initialMetadata = useMemo(
    () => buildInitialMetadata(image, excludedProperties),
    [image.id, image.updated_at, excludedPropertiesData]
  )

  if (!isOpen || excludedPropertiesData === undefined) return null

  return (
    <EditImageMetadataModalInner
      key={`${image.id}-${image.updated_at}-${excludedProperties.size}`}
      isLoading={isLoading}
      onClose={onClose}
      onSave={onSave}
      initialMetadata={initialMetadata}
      excludedProperties={excludedProperties}
    />
  )
}

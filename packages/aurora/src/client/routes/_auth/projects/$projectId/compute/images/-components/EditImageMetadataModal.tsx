import React, { useState, useMemo, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Button,
  Status,
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  TextInput,
  Message,
  toast,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"
import { TrpcClient } from "@/client/trpcClient"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  getImageMetadataPropertyCreatedToast,
  getImageMetadataPropertyUpdatedToast,
  getImageMetadataPropertyDeletedToast,
} from "./ImageToastNotifications"

interface EditImageMetadataModalProps {
  client: TrpcClient
  image: GlanceImage
  isOpen: boolean
  canEdit?: boolean
  onClose: () => void
  projectId: string
}

interface MetadataEntry {
  key: string
  value: string
  isNew?: boolean
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
  editingValue?: string
}

function toStrValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function buildInitialMetadata(image: GlanceImage, excludedProperties: Set<string>): MetadataEntry[] {
  return Object.entries(image)
    .filter(([key]) => !excludedProperties.has(key.toLowerCase()))
    .map(([key, value]) => {
      const strValue = toStrValue(value)
      return { key, value: strValue, isNew: false, isEditing: false, originalKey: key, originalValue: strValue }
    })
    .sort((a, b) => a.key.localeCompare(b.key)) // Sort ascending A-Z
}

// Inner component receives already-computed initialMetadata so useState is seeded correctly
function EditImageMetadataModalInner({
  client,
  onClose,
  initialMetadata,
  excludedProperties,
  canEdit = true,
  projectId,
  imageId,
}: {
  client: TrpcClient
  onClose: () => void
  initialMetadata: MetadataEntry[]
  excludedProperties: Set<string>
  canEdit?: boolean
  projectId: string
  imageId: string
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [metadata, setMetadata] = useState<MetadataEntry[]>(initialMetadata)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [operationInProgress, setOperationInProgress] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const isModalDisabled = operationInProgress || isAddingNew || metadata.some((e) => e.isEditing)

  const validateKey = (key: string, originalKey?: string, rowIndex?: number): string | null => {
    const normalized = key?.trim().toLowerCase()
    if (!normalized) {
      return t`Key is required`
    }
    if (excludedProperties.has(normalized)) {
      return t`This property is reserved and cannot be modified`
    }
    const isDuplicate = metadata.some(
      (entry, idx) =>
        entry.key.trim().toLowerCase() === normalized && idx !== rowIndex && entry.originalKey !== originalKey
    )
    if (isDuplicate) {
      return t`A property with this key already exists`
    }
    return null
  }

  const handleAddNew = async () => {
    const keyError = validateKey(newKey, undefined, metadata.length)
    if (keyError) {
      setErrors({ newKey: "error" })
      setValidationMessage(keyError)
      return
    }
    if (!newValue.trim()) {
      setErrors({ newValue: "error" })
      setValidationMessage(t`Value is required`)
      return
    }

    setOperationInProgress(true)
    try {
      await client.compute.updateImage.mutate({
        project_id: projectId,
        imageId,
        operations: [{ op: "add", path: `/${newKey.trim()}`, value: newValue.trim() }],
      })

      setMetadata((prev) => [
        {
          key: newKey.trim(),
          value: newValue.trim(),
          isNew: false,
          isEditing: false,
          originalKey: newKey.trim(),
          originalValue: newValue.trim(),
        },
        ...prev,
      ])
      setNewKey("")
      setNewValue("")
      setIsAddingNew(false)
      setErrors({})
      setValidationMessage(null)
      const { message, ...options } = getImageMetadataPropertyCreatedToast()
      toast.success(message, options)
    } catch (error) {
      const errorMsg = translateError(error instanceof Error ? error.message : "Failed to create property")
      setValidationMessage(errorMsg)
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleCancelAdd = () => {
    setNewKey("")
    setNewValue("")
    setIsAddingNew(false)
    setErrors({})
    setValidationMessage(null)
  }

  const handleEdit = (index: number) => {
    setMetadata((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, isEditing: true, editingValue: entry.value } : { ...entry, isEditing: false }
      )
    )
    setIsAddingNew(false)
  }

  const handleSaveEdit = async (index: number) => {
    const entry = metadata[index]
    const keyError = validateKey(entry.key, entry.originalKey, index)
    if (keyError) {
      setErrors({ [`edit-${index}`]: "error" })
      setValidationMessage(keyError)
      return
    }
    if (!entry.value.trim()) {
      setErrors({ [`edit-${index}`]: "error" })
      setValidationMessage(t`Value is required`)
      return
    }

    setOperationInProgress(true)
    try {
      const trimmedValue = entry.value.trim()
      const trimmedKey = entry.key.trim()
      const keyChanged = entry.originalKey !== undefined && entry.originalKey !== trimmedKey
      // A renamed key is a new JSON Pointer, so "replace" (RFC 6902) would fail.
      // Use "add" for the new key + "remove" for the old; "replace" only when unchanged.
      const operations: Array<{ op: "add" | "replace" | "remove"; path: string; value?: unknown }> = keyChanged
        ? [
            { op: "add", path: `/${trimmedKey}`, value: trimmedValue },
            { op: "remove", path: `/${entry.originalKey}` },
          ]
        : [{ op: "replace", path: `/${trimmedKey}`, value: trimmedValue }]

      await client.compute.updateImage.mutate({ project_id: projectId, imageId, operations })

      setMetadata((prev) =>
        prev.map((e, i) =>
          i === index
            ? {
                key: entry.key.trim(),
                value: trimmedValue,
                isEditing: false,
                originalKey: entry.key.trim(),
                originalValue: trimmedValue,
              }
            : e
        )
      )
      setErrors({})
      setValidationMessage(null)
      const { message, ...options } = getImageMetadataPropertyUpdatedToast()
      toast.success(message, options)
    } catch (error) {
      const errorMsg = translateError(error instanceof Error ? error.message : "Failed to update property")
      setValidationMessage(errorMsg)
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleCancelEdit = (index: number) => {
    setMetadata((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, isEditing: false, key: e.originalKey ?? e.key, value: e.editingValue ?? e.value } : e
      )
    )
    setErrors({})
    setValidationMessage(null)
  }

  const handleDelete = async (index: number) => {
    const entry = metadata[index]
    setOperationInProgress(true)

    try {
      await client.compute.updateImage.mutate({
        project_id: projectId,
        imageId,
        operations: [{ op: "remove", path: `/${entry.key}` }],
      })
      setMetadata((prev) => prev.filter((_, i) => i !== index))
      setErrors({})
      setValidationMessage(null)
      const { message, ...options } = getImageMetadataPropertyDeletedToast()
      toast.success(message, options)
    } catch (error) {
      const errorMsg = translateError(error instanceof Error ? error.message : "Failed to delete property")
      setValidationMessage(errorMsg)
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleKeyChange = (index: number, value: string) => {
    setMetadata((prev) => prev.map((entry, i) => (i === index ? { ...entry, key: value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
      setValidationMessage(null)
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setMetadata((prev) => prev.map((entry, i) => (i === index ? { ...entry, value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
      setValidationMessage(null)
    }
  }

  const handleClose = () => {
    if (!operationInProgress) {
      setIsAddingNew(false)
      setNewKey("")
      setNewValue("")
      setErrors({})
      setValidationMessage(null)
      onClose()
    }
  }

  return (
    <Modal
      open
      onCancel={handleClose}
      size="xl"
      title={canEdit ? t`Edit Metadata` : t`Show Metadata`}
      cancelButtonLabel={t`Close`}
      disableCancelButton={operationInProgress}
    >
      <div>
        {validationMessage && <Message variant="error" text={validationMessage} className="mb-4" />}

        {canEdit && (
          <Stack direction="horizontal" className="mb-4 justify-end p-2">
            <Button label={t`Add Property`} onClick={() => setIsAddingNew(true)} disabled={isModalDisabled} />
          </Stack>
        )}
        {metadata.length === 0 && !isAddingNew ? (
          <p className="jn:text-theme-light py-8 text-center">
            {canEdit
              ? t`No custom metadata properties found. Click "Add Property" to create one.`
              : t`No custom metadata properties found.`}
          </p>
        ) : (
          <DescriptionList className="mb-6" alignTerms="left">
            <>
              {isAddingNew && (
                <>
                  <DescriptionTerm>
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
                          setValidationMessage(null)
                        }
                      }}
                      placeholder={t`Property Key`}
                      invalid={!!errors.newKey}
                      autoFocus
                      disabled={operationInProgress}
                    />
                  </DescriptionTerm>
                  <DescriptionDefinition>
                    <Stack direction="horizontal" gap="2" alignment="center" className="justify-between">
                      <div className="flex-1">
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
                              setValidationMessage(null)
                            }
                          }}
                          placeholder={t`Value`}
                          invalid={!!errors.newValue}
                          disabled={operationInProgress}
                        />
                      </div>
                      <Stack direction="horizontal" gap="2" className="shrink-0">
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => {
                            console.log("Save button clicked")
                            handleAddNew()
                          }}
                          icon="check"
                          title={t`Save`}
                          disabled={!newKey.trim() || operationInProgress}
                        />
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={handleCancelAdd}
                          icon="close"
                          title={t`Discard`}
                          disabled={operationInProgress}
                        />
                      </Stack>
                    </Stack>
                  </DescriptionDefinition>
                </>
              )}
            </>

            <>
              {metadata.map((entry, index) => (
                <React.Fragment key={`${entry.originalKey}-${index}`}>
                  <DescriptionTerm>
                    {entry.isEditing ? (
                      <TextInput
                        value={entry.key}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        invalid={!!errors[`edit-${index}`]}
                        disabled={operationInProgress}
                      />
                    ) : (
                      <span className="jn:text-theme-high block max-w-xs truncate" title={entry.key}>
                        {entry.key}
                      </span>
                    )}
                  </DescriptionTerm>
                  <DescriptionDefinition className="flex items-center justify-between gap-2">
                    {entry.isEditing ? (
                      <>
                        <div className="flex-1">
                          <TextInput
                            value={entry.value}
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            invalid={!!errors[`edit-${index}`]}
                            disabled={operationInProgress}
                          />
                        </div>
                        <Stack direction="horizontal" gap="2" className="shrink-0">
                          <Button
                            size="small"
                            variant="primary"
                            onClick={() => handleSaveEdit(index)}
                            icon="check"
                            title={t`Save`}
                            disabled={operationInProgress}
                          />
                          <Button
                            size="small"
                            variant="subdued"
                            onClick={() => handleCancelEdit(index)}
                            icon="close"
                            title={t`Discard`}
                            disabled={operationInProgress}
                          />
                        </Stack>
                      </>
                    ) : (
                      <>
                        <span className="jn:text-theme-default block max-w-md truncate" title={entry.value}>
                          {entry.value}
                        </span>
                        {canEdit && (
                          <Stack direction="horizontal" gap="2">
                            <Button
                              size="small"
                              variant="subdued"
                              onClick={() => handleEdit(index)}
                              icon="edit"
                              data-testid={`edit-${entry.key}`}
                              title={t`Edit`}
                              disabled={isModalDisabled}
                            />
                            <Button
                              size="small"
                              onClick={() => handleDelete(index)}
                              icon="deleteForever"
                              aria-label={t`Delete`}
                              data-testid={`delete-${entry.key}`}
                              title={t`Delete`}
                              disabled={isModalDisabled}
                            />
                          </Stack>
                        )}
                      </>
                    )}
                  </DescriptionDefinition>
                </React.Fragment>
              ))}
            </>
          </DescriptionList>
        )}
      </div>
    </Modal>
  )
}

export const EditImageMetadataModal: React.FC<EditImageMetadataModalProps> = ({
  client,
  image,
  isOpen,
  canEdit = true,
  onClose,
  projectId,
}) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [excludedPropertiesData, setExcludedPropertiesData] = useState<string[] | null>(null)
  const [isLoadingExcluded, setIsLoadingExcluded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !projectId) {
      setExcludedPropertiesData(null)
      setLoadError(null)
      return
    }

    let cancelled = false
    setIsLoadingExcluded(true)
    setLoadError(null)

    const loadData = async () => {
      try {
        const data = await client.compute.getImageMetadataExcludedProperties.query({ project_id: projectId })
        if (cancelled) return
        setExcludedPropertiesData(data)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : "Failed to Load Metadata Configuration")
      } finally {
        if (!cancelled) setIsLoadingExcluded(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [isOpen, projectId])

  const excludedProperties = useMemo(
    () => new Set((excludedPropertiesData ?? []).map((s) => s.toLowerCase())),
    [excludedPropertiesData]
  )
  const initialMetadata = useMemo(
    () => buildInitialMetadata(image, excludedProperties),
    [image.id, image.updated_at, excludedProperties]
  )

  if (!isOpen) return null

  if (isLoadingExcluded) {
    return (
      <Modal open onCancel={onClose} size="xl" title={canEdit ? t`Edit Metadata` : t`Show Metadata`}>
        <Status status="progress" title={t`Loading Metadata Configuration...`} className="mt-0" />
      </Modal>
    )
  }

  if (loadError) {
    return (
      <Modal open onCancel={onClose} size="xl" title={canEdit ? t`Edit Metadata` : t`Show Metadata`}>
        <Status
          status="error"
          title={t`Failed to Load Metadata Configuration`}
          body={translateError(loadError)}
          className="mt-0"
        />
      </Modal>
    )
  }

  return (
    <EditImageMetadataModalInner
      client={client}
      onClose={onClose}
      initialMetadata={initialMetadata}
      excludedProperties={excludedProperties}
      canEdit={canEdit}
      projectId={projectId}
      imageId={image.id}
    />
  )
}

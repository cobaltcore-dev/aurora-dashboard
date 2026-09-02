import React, { useState, useEffect, useMemo } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Button,
  Spinner,
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  TextInput,
  Message,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
  canEdit?: boolean
}

interface SpecEntry {
  key: string
  value: string
  isNew?: boolean
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

function buildInitialSpecs(extraSpecs: Record<string, string>): SpecEntry[] {
  return Object.entries(extraSpecs).map(([key, value]) => ({
    key,
    value,
    isNew: false,
    isEditing: false,
    originalKey: key,
    originalValue: value,
  }))
}

const createPermissionsPromise = (client: TrpcClient, project: string) => {
  return client.compute.canUser
    .query({
      project_id: project,
      permission: ["flavor_specs:create", "flavor_specs:delete"],
    })
    .then(([canCreate, canDelete]) => ({ canCreate, canDelete }))
}

const createExtraSpecsPromise = (client: TrpcClient, project: string, flavorId: string) => {
  return client.compute.getExtraSpecs.query({
    project_id: project,
    flavorId: flavorId,
  })
}

function EditSpecModalInner({
  client,
  project,
  flavor,
  isLoading,
  onClose,
  initialSpecs,
  canEdit,
}: {
  client: TrpcClient
  project: string
  flavor: Flavor
  isLoading: boolean
  onClose: () => void
  initialSpecs: SpecEntry[]
  canEdit: boolean
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [specs, setSpecs] = useState<SpecEntry[]>(initialSpecs)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasChanges = useMemo(() => {
    // Build maps for comparison
    const currentSpecs = new Map(specs.map((s) => [s.key.trim(), s.value.trim()]))
    const originalSpecs = new Map(initialSpecs.map((s) => [s.key.trim(), s.value.trim()]))

    if (currentSpecs.size !== originalSpecs.size) return true
    for (const [key, value] of currentSpecs) {
      if (originalSpecs.get(key) !== value) return true
    }
    return false
  }, [specs, initialSpecs])

  const isSubmitDisabled = !hasChanges || isLoading || isSaving || isAddingNew || specs.some((e) => e.isEditing)

  const validateKey = (key: string, rowIndex?: number): string | null => {
    const normalized = key?.trim()
    if (!normalized) {
      return t`Key is required`
    }
    const isDuplicate = specs.some((entry, idx) => entry.key.trim() === normalized && idx !== rowIndex)
    if (isDuplicate) {
      return t`A property with this key already exists`
    }
    return null
  }

  const handleAddNew = () => {
    const keyError = validateKey(newKey, specs.length)
    if (keyError) {
      setErrors({ newKey: keyError })
      return
    }
    if (!newValue.trim()) {
      setErrors({ newValue: t`Value is required` })
      return
    }
    setSpecs([...specs, { key: newKey.trim(), value: newValue.trim(), isNew: true, isEditing: false }])
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
    setSpecs(specs.map((entry, i) => (i === index ? { ...entry, isEditing: true } : { ...entry, isEditing: false })))
    setIsAddingNew(false)
  }

  const handleSaveEdit = (index: number) => {
    const entry = specs[index]
    const keyError = validateKey(entry.key, index)
    if (keyError) {
      setErrors({ [`edit-${index}`]: keyError })
      return
    }
    if (!entry.value.trim()) {
      setErrors({ [`edit-${index}`]: t`Value is required` })
      return
    }
    setSpecs(
      specs.map((e, i) => (i === index ? { ...e, isEditing: false, key: e.key.trim(), value: e.value.trim() } : e))
    )
    setErrors({})
  }

  const handleCancelEdit = (index: number) => {
    setSpecs(
      specs.map((e, i) =>
        i === index ? { ...e, isEditing: false, key: e.originalKey ?? e.key, value: e.originalValue ?? e.value } : e
      )
    )
    setErrors({})
  }

  const handleDelete = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index))
    setErrors({})
  }

  const handleKeyChange = (index: number, value: string) => {
    setSpecs(specs.map((entry, i) => (i === index ? { ...entry, key: value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setSpecs(specs.map((entry, i) => (i === index ? { ...entry, value } : entry)))
    if (errors[`edit-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
    }
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      // Collect keys to delete (in initialSpecs but not in current specs, or key was renamed)
      const currentKeys = new Set(specs.map((s) => s.key))
      const keysToDelete = initialSpecs
        .filter((initial) => !currentKeys.has(initial.key))
        .map((s) => s.originalKey!)
        .filter(Boolean)

      // Also delete old keys when a key was renamed
      specs.forEach((entry) => {
        if (entry.originalKey && entry.key !== entry.originalKey && !entry.isNew) {
          keysToDelete.push(entry.originalKey)
        }
      })

      // Collect specs to create/update
      const specsToSave: Record<string, string> = {}
      specs.forEach((entry) => {
        if (entry.isNew || entry.key !== entry.originalKey || entry.value !== entry.originalValue) {
          specsToSave[entry.key] = entry.value
        }
      })

      // Delete removed/renamed specs
      for (const key of new Set(keysToDelete)) {
        await client.compute.deleteExtraSpec.mutate({
          project_id: project,
          flavorId: flavor.id,
          key,
        })
      }

      // Create/update specs
      if (Object.keys(specsToSave).length > 0) {
        await client.compute.createExtraSpecs.mutate({
          project_id: project,
          flavorId: flavor.id,
          extra_specs: specsToSave,
        })
      }

      onClose()
    } catch (error) {
      setSaveError(translateError(error instanceof Error ? error.message : "Failed to save changes"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setSpecs(initialSpecs)
    setIsAddingNew(false)
    setNewKey("")
    setNewValue("")
    setErrors({})
    setSaveError(null)
    onClose()
  }

  return (
    <Modal
      open
      onCancel={handleClose}
      size="large"
      title={canEdit ? t`Edit Metadata` : t`Metadata`}
      onConfirm={canEdit ? handleSubmit : undefined}
      confirmButtonLabel={t`Save Changes`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isSubmitDisabled}
    >
      {isLoading ? (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <div>
          {saveError && (
            <Message variant="error" text={saveError} className="mb-4" onDismiss={() => setSaveError(null)} />
          )}

          {canEdit && (
            <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 mb-4 justify-end p-2">
              <Button
                label={t`Add Property`}
                onClick={() => setIsAddingNew(true)}
                variant="primary"
                disabled={isAddingNew || specs.some((e) => e.isEditing)}
                icon="addCircle"
              />
            </Stack>
          )}

          {specs.length === 0 && !isAddingNew ? (
            <p className="jn:text-theme-light py-8 text-center">
              {canEdit
                ? t`No metadata properties found. Click "Add Property" to create one.`
                : t`No metadata properties found.`}
            </p>
          ) : (
            <DescriptionList className="mb-6">
              <DescriptionTerm>{t`Property Key`}</DescriptionTerm>
              <DescriptionDefinition>{t`Value`}</DescriptionDefinition>

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
                          }
                        }}
                        placeholder={t`property_key`}
                        errortext={errors.newKey}
                        autoFocus
                      />
                    </DescriptionTerm>
                    <DescriptionDefinition>
                      <Stack direction="horizontal" gap="2" alignment="center" className="justify-between">
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
                        <Stack direction="horizontal" gap="2">
                          <Button size="small" variant="primary" onClick={handleAddNew} icon="check" title={t`Save`} />
                          <Button
                            size="small"
                            variant="subdued"
                            onClick={handleCancelAdd}
                            icon="close"
                            title={t`Discard`}
                          />
                        </Stack>
                      </Stack>
                    </DescriptionDefinition>
                  </>
                )}
              </>

              <>
                {specs.map((entry, index) => (
                  <React.Fragment key={`${entry.originalKey}-${index}`}>
                    <DescriptionTerm>
                      {entry.isEditing ? (
                        <TextInput
                          value={entry.key}
                          onChange={(e) => handleKeyChange(index, e.target.value)}
                          errortext={errors[`edit-${index}`]}
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
                          <TextInput
                            value={entry.value}
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            errortext={errors[`edit-${index}`]}
                          />
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
                                disabled={isAddingNew || specs.some((e) => e.isEditing)}
                              />
                              <Button
                                size="small"
                                onClick={() => handleDelete(index)}
                                icon="deleteForever"
                                data-testid={`delete-${entry.key}`}
                                title={t`Delete`}
                                disabled={isAddingNew || specs.some((e) => e.isEditing)}
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
      )}
    </Modal>
  )
}

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor, canEdit }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [extraSpecsData, setExtraSpecsData] = useState<Record<string, string> | null>(null)
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resolvedCanEdit, setResolvedCanEdit] = useState<boolean | undefined>(canEdit)

  useEffect(() => {
    if (!isOpen || !flavor?.id) {
      setExtraSpecsData(null)
      setLoadError(null)
      return
    }

    let cancelled = false
    setIsLoadingSpecs(true)
    setLoadError(null)

    const loadData = async () => {
      try {
        const [specs, permissions] = await Promise.all([
          createExtraSpecsPromise(client, project, flavor.id),
          canEdit !== undefined
            ? Promise.resolve({ canCreate: canEdit, canDelete: canEdit })
            : createPermissionsPromise(client, project),
        ])
        if (cancelled) return
        setExtraSpecsData(specs)
        setResolvedCanEdit(permissions.canCreate || permissions.canDelete)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : "Failed to load metadata")
      } finally {
        if (!cancelled) setIsLoadingSpecs(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [isOpen, flavor?.id, client, project, canEdit])

  const initialSpecs = useMemo(() => (extraSpecsData ? buildInitialSpecs(extraSpecsData) : []), [extraSpecsData])

  if (!isOpen || !flavor) {
    return null
  }

  if (isLoadingSpecs) {
    return (
      <Modal open onCancel={onClose} size="large" title={t`Edit Metadata`}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </Modal>
    )
  }

  if (loadError) {
    return (
      <Modal open onCancel={onClose} size="large" title={t`Edit Metadata`}>
        <Message variant="error" text={translateError(loadError)} />
      </Modal>
    )
  }

  return (
    <EditSpecModalInner
      key={flavor.id}
      client={client}
      project={project}
      flavor={flavor}
      isLoading={false}
      onClose={onClose}
      initialSpecs={initialSpecs}
      canEdit={resolvedCanEdit ?? false}
    />
  )
}

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
  Status,
  toast,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

interface SpecEntry {
  key: string
  value: string
  isEditing?: boolean
  editingValue?: string
}

function buildInitialSpecs(extraSpecs: Record<string, string>): SpecEntry[] {
  return Object.entries(extraSpecs).map(([key, value]) => ({
    key,
    value,
    isEditing: false,
  }))
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
}: {
  client: TrpcClient
  project: string
  flavor: Flavor
  isLoading: boolean
  onClose: () => void
  initialSpecs: SpecEntry[]
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [specs, setSpecs] = useState<SpecEntry[]>(initialSpecs)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [operationInProgress, setOperationInProgress] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const isModalDisabled = operationInProgress || isAddingNew || specs.some((e) => e.isEditing)

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

  const handleAddNew = async () => {
    const keyError = validateKey(newKey, specs.length)
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
      await client.compute.createExtraSpecs.mutate({
        project_id: project,
        flavorId: flavor.id,
        extra_specs: { [newKey.trim()]: newValue.trim() },
      })

      setSpecs([...specs, { key: newKey.trim(), value: newValue.trim(), isEditing: false }])
      setNewKey("")
      setNewValue("")
      setIsAddingNew(false)
      setErrors({})
      setValidationMessage(null)

      toast.success(t`Property Created`, {
        description: t`Property was successfully created.`,
      })
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
    setSpecs(
      specs.map((e, i) => (i === index ? { ...e, isEditing: true, editingValue: e.value } : { ...e, isEditing: false }))
    )
    setIsAddingNew(false)
  }

  const handleSaveEdit = async (index: number) => {
    const spec = specs[index]

    if (!spec.value.trim()) {
      setErrors({ [`edit-value-${index}`]: "error" })
      setValidationMessage(t`Value is required`)
      return
    }

    setOperationInProgress(true)
    try {
      const trimmedValue = spec.value.trim()

      // Create/update the spec (OpenStack API handles upsert)
      await client.compute.createExtraSpecs.mutate({
        project_id: project,
        flavorId: flavor.id,
        extra_specs: { [spec.key]: trimmedValue },
      })

      setSpecs(specs.map((e, i) => (i === index ? { key: spec.key, value: trimmedValue, isEditing: false } : e)))
      setErrors({})
      setValidationMessage(null)

      toast.success(t`Property Updated`, {
        description: t`Property was successfully updated.`,
      })
    } catch (error) {
      const errorMsg = translateError(error instanceof Error ? error.message : "Failed to update property")
      setValidationMessage(errorMsg)
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleCancelEdit = (index: number) => {
    setSpecs(
      specs.map((e, i) => (i === index ? { key: e.key, value: e.editingValue ?? e.value, isEditing: false } : e))
    )
    setErrors({})
    setValidationMessage(null)
  }

  const handleDelete = async (index: number) => {
    const spec = specs[index]
    setOperationInProgress(true)

    try {
      await client.compute.deleteExtraSpec.mutate({
        project_id: project,
        flavorId: flavor.id,
        key: spec.key,
      })

      setSpecs(specs.filter((_, i) => i !== index))
      setErrors({})
      setValidationMessage(null)

      toast.success(t`Property Deleted`, {
        description: t`Property was successfully deleted.`,
      })
    } catch (error) {
      const errorMsg = translateError(error instanceof Error ? error.message : "Failed to delete property")
      setValidationMessage(errorMsg)
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setSpecs(specs.map((entry, i) => (i === index ? { ...entry, value } : entry)))
    if (errors[`edit-value-${index}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-value-${index}`]
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
      title={t`Edit Metadata`}
      cancelButtonLabel={t`Close`}
      disableCancelButton={operationInProgress}
    >
      {isLoading ? (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <div>
          {validationMessage && <Message variant="error" text={validationMessage} className="mb-4" />}

          <Stack direction="horizontal" className="mb-4 justify-end">
            <Button label={t`Add Property`} onClick={() => setIsAddingNew(true)} disabled={isModalDisabled} />
          </Stack>

          {specs.length === 0 && !isAddingNew ? (
            <Status
              status="empty"
              title={t`No metadata properties found`}
              body={t`Click "Add Property" to create one.`}
            />
          ) : (
            <DescriptionList className="mb-6 grid-cols-2" alignTerms="left">
              <>
                {isAddingNew && (
                  <>
                    <DescriptionTerm className="col-span-1">
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
                        placeholder={t`property_key`}
                        invalid={!!errors.newKey}
                        autoFocus
                        disabled={operationInProgress}
                      />
                    </DescriptionTerm>
                    <DescriptionDefinition className="col-span-1 flex items-center gap-2">
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
                          onClick={handleAddNew}
                          icon="check"
                          title={t`Save`}
                          aria-label={t`Save`}
                          disabled={operationInProgress}
                        />
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={handleCancelAdd}
                          icon="close"
                          title={t`Discard`}
                          aria-label={t`Discard`}
                          disabled={operationInProgress}
                        />
                      </Stack>
                    </DescriptionDefinition>
                  </>
                )}
              </>

              <>
                {specs.map((entry, index) => (
                  <React.Fragment key={index}>
                    <DescriptionTerm className="col-span-1">
                      {entry.isEditing ? (
                        <span className="jn:text-theme-high block max-w-xs truncate" title={entry.key}>
                          {entry.key}
                        </span>
                      ) : (
                        <span className="jn:text-theme-high block max-w-xs truncate" title={entry.key}>
                          {entry.key}
                        </span>
                      )}
                    </DescriptionTerm>
                    <DescriptionDefinition className="col-span-1 flex items-center gap-2">
                      {entry.isEditing ? (
                        <>
                          <div className="flex-1">
                            <TextInput
                              value={entry.value}
                              onChange={(e) => handleValueChange(index, e.target.value)}
                              invalid={!!errors[`edit-value-${index}`]}
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
                              aria-label={t`Save`}
                              disabled={operationInProgress}
                            />
                            <Button
                              size="small"
                              variant="subdued"
                              onClick={() => handleCancelEdit(index)}
                              icon="close"
                              title={t`Discard`}
                              aria-label={t`Discard`}
                              disabled={operationInProgress}
                            />
                          </Stack>
                        </>
                      ) : (
                        <>
                          <span className="jn:text-theme-default flex-1 truncate" title={entry.value}>
                            {entry.value}
                          </span>
                          <Stack direction="horizontal" gap="2" className="shrink-0">
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
                              data-testid={`delete-${entry.key}`}
                              title={t`Delete`}
                              aria-label={t`Delete`}
                              disabled={isModalDisabled}
                            />
                          </Stack>
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

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [extraSpecsData, setExtraSpecsData] = useState<Record<string, string> | null>(null)
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

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
        const specs = await createExtraSpecsPromise(client, project, flavor.id)
        if (cancelled) return
        setExtraSpecsData(specs)
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
  }, [isOpen, flavor?.id, client, project])

  const initialSpecs = useMemo(() => (extraSpecsData ? buildInitialSpecs(extraSpecsData) : []), [extraSpecsData])

  if (!isOpen || !flavor) {
    return null
  }

  if (isLoadingSpecs) {
    return (
      <Modal open onCancel={onClose} size="xl" title={t`Edit Metadata`}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </Modal>
    )
  }

  if (loadError) {
    return (
      <Modal open onCancel={onClose} size="xl" title={t`Edit Metadata`}>
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
    />
  )
}

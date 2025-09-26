import React, { useState, useEffect } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Message,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Button,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { SpecFormRow } from "./SpecFormRow"
import { SpecRow } from "./SpecRow"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  // Extra specs state
  const [extraSpecs, setExtraSpecs] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({})

  // UI state
  const [isAddingSpec, setIsAddingSpec] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  // Fetch extra specs
  const fetchExtraSpecs = async () => {
    if (!flavor?.id) return

    try {
      setIsLoading(true)
      const specs = await client.compute.getExtraSpecs.query({
        projectId: project,
        flavorId: flavor.id,
      })
      setExtraSpecs(specs)
    } catch (err) {
      setMessage({
        text: translateError(err instanceof Error ? err.message : "Failed to fetch extra specs"),
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && flavor?.id) {
      fetchExtraSpecs()
    }
  }, [isOpen, flavor?.id])

  // Form validation
  const validateForm = () => {
    const trimmedKey = key.trim()
    const trimmedValue = value.trim()
    const newErrors: { key?: string; value?: string } = {}

    if (!trimmedKey) {
      newErrors.key = "Key is required."
    } else if (Object.keys(extraSpecs).includes(trimmedKey)) {
      newErrors.key = "Key already exists."
    }

    if (!trimmedValue) {
      newErrors.value = "Value is required."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Reset form
  const resetForm = () => {
    setKey("")
    setValue("")
    setErrors({})
  }

  const handleClose = () => {
    setMessage(null)
    resetForm()
    setIsAddingSpec(false)
    onClose()
  }

  const handleSave = async () => {
    if (!validateForm()) {
      setMessage({ text: t`Please fix the validation errors below.`, type: "error" })
      return
    }

    if (!flavor?.id) return

    try {
      const trimmedKey = key.trim()
      const trimmedValue = value.trim()

      await client.compute.createExtraSpecs.mutate({
        projectId: project,
        flavorId: flavor.id,
        extra_specs: { [trimmedKey]: trimmedValue },
      })

      setExtraSpecs((prev) => ({ [trimmedKey]: trimmedValue, ...prev }))
      setMessage({
        text: t`Extra spec "${trimmedKey}" has been added successfully.`,
        type: "success",
      })
      resetForm()
      setIsAddingSpec(false)
    } catch (error) {
      setMessage({
        text: translateError(error instanceof Error ? error.message : "Failed to create extra spec"),
        type: "error",
      })
    }
  }

  const handleDelete = async (keyToDelete: string) => {
    if (!flavor?.id) return

    try {
      setIsDeleting(keyToDelete)
      await client.compute.deleteExtraSpec.mutate({
        projectId: project,
        flavorId: flavor.id,
        key: keyToDelete,
      })

      setExtraSpecs((prev) => {
        const newSpecs = { ...prev }
        delete newSpecs[keyToDelete]
        return newSpecs
      })
      setMessage({ text: t`Extra spec "${keyToDelete}" has been deleted successfully.`, type: "success" })
    } catch (error) {
      setMessage({
        text: translateError(error instanceof Error ? error.message : `Failed to delete extra spec "${keyToDelete}"`),
        type: "error",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleKeyChange = (newKey: string) => {
    setKey(newKey)
    if (errors.key) setErrors((prev) => ({ ...prev, key: undefined }))
  }

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }))
  }

  const shouldShowEmptyState = !isLoading && Object.keys(extraSpecs).length === 0 && !isAddingSpec

  return (
    <Modal onCancel={handleClose} title={t`Edit Extra Specs`} open={isOpen} size="large">
      <div>
        {message && (
          <Message onDismiss={() => setMessage(null)} text={message.text} variant={message.type} className="mb-4" />
        )}

        {flavor && (
          <>
            <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
              <Button
                icon="addCircle"
                label={t`Add Extra Spec`}
                data-testid="addExtraButton"
                onClick={() => setIsAddingSpec(true)}
                variant="primary"
                disabled={isAddingSpec}
              />
            </Stack>

            <DataGrid columns={3}>
              <DataGridRow>
                <DataGridHeadCell>{t`Key`}</DataGridHeadCell>
                <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
                <DataGridHeadCell></DataGridHeadCell>
              </DataGridRow>

              {isAddingSpec && (
                <SpecFormRow
                  specKey={key} // Pass as specKey instead of key
                  value={value}
                  errors={errors}
                  isLoading={isLoading}
                  onKeyChange={handleKeyChange}
                  onValueChange={handleValueChange}
                  onSave={handleSave}
                  onCancel={() => {
                    resetForm()
                    setIsAddingSpec(false)
                    setMessage(null)
                  }}
                />
              )}

              {Object.entries(extraSpecs).map(([specKey, specValue]) => (
                <SpecRow
                  key={specKey}
                  specKey={specKey}
                  value={specValue}
                  isDeleting={isDeleting === specKey}
                  onDelete={() => handleDelete(specKey)}
                />
              ))}

              {isLoading && (
                <DataGridRow>
                  <DataGridCell colSpan={3}>
                    <Stack distribution="center" alignment="center">
                      <Spinner variant="primary" />
                    </Stack>
                  </DataGridCell>
                </DataGridRow>
              )}

              {shouldShowEmptyState && (
                <DataGridRow>
                  <DataGridCell colSpan={3} className="text-center py-4 text-theme-default">
                    {t`No extra specs found. Click "Add Extra Spec" to create one.`}
                  </DataGridCell>
                </DataGridRow>
              )}
            </DataGrid>
          </>
        )}
      </div>
    </Modal>
  )
}

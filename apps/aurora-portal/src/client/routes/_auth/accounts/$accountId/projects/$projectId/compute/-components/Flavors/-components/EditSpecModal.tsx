import React, { useState, useEffect } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Message,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Button,
  TextInput,
  ButtonRow,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

interface FieldErrors {
  key?: string
  value?: string
}

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string>("")
  const [newValue, setNewValue] = useState<string>("")
  const [isAddingSpec, setIsAddingSpec] = useState<boolean>(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [extraSpecs, setExtraSpecs] = useState<Record<string, string>>({})
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)

  // Fetch extra specs when modal opens or flavor changes
  useEffect(() => {
    if (isOpen && flavor?.id) {
      fetchExtraSpecs()
    }
  }, [isOpen, flavor?.id])

  const fetchExtraSpecs = async () => {
    if (!flavor?.id) return

    try {
      setIsLoadingSpecs(true)
      const specs = await client.compute.getExtraSpecs.query({
        projectId: project,
        flavorId: flavor.id,
      })
      setExtraSpecs(specs)
    } catch (error) {
      console.error("Failed to fetch extra specs:", error)
      const errorMessage = (error as Error)?.message
        ? translateError((error as Error).message)
        : t`Failed to load extra specs. Please try again.`
      setGeneralError(errorMessage)
    } finally {
      setIsLoadingSpecs(false)
    }
  }

  const validateKey = (key: string): string | undefined => {
    const trimmedKey = key.trim()
    if (!trimmedKey) {
      return t`Key is required.`
    }
    if (extraSpecs[trimmedKey]) {
      return t`Key already exists.`
    }

    return undefined
  }

  const validateValue = (value: string): string | undefined => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return t`Value is required.`
    }
    return undefined
  }

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewKey(value)

    // Clear messages when user starts typing
    if (generalError) setGeneralError(null)
    if (successMessage) setSuccessMessage(null)

    // Clear key error when user starts typing
    if (errors.key) {
      setErrors((prev) => ({ ...prev, key: undefined }))
    }
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewValue(value)

    // Clear messages when user starts typing
    if (generalError) setGeneralError(null)
    if (successMessage) setSuccessMessage(null)

    // Clear value error when user starts typing
    if (errors.value) {
      setErrors((prev) => ({ ...prev, value: undefined }))
    }
  }

  const handleKeyBlur = () => {
    const trimmedKey = newKey.trim()
    // Update the state with trimmed value
    if (trimmedKey !== newKey) {
      setNewKey(trimmedKey)
    }
    const error = validateKey(newKey)
    setErrors((prev) => ({ ...prev, key: error }))
  }

  const handleValueBlur = () => {
    const trimmedValue = newValue.trim()
    // Update the state with trimmed value
    if (trimmedValue !== newValue) {
      setNewValue(trimmedValue)
    }
    const error = validateValue(newValue)
    setErrors((prev) => ({ ...prev, value: error }))
  }

  const handleClose = () => {
    setGeneralError(null)
    setSuccessMessage(null)
    setErrors({})
    setNewKey("")
    setNewValue("")
    setIsAddingSpec(false)
    setExtraSpecs({})
    onClose()
  }

  const dismissError = () => {
    setGeneralError(null)
  }

  const dismissSuccess = () => {
    setSuccessMessage(null)
  }

  const handleAddSpec = () => {
    setIsAddingSpec(true)
    setErrors({})
    setGeneralError(null)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    setGeneralError(null)
    setSuccessMessage(null)

    const trimmedKey = newKey.trim()
    const trimmedValue = newValue.trim()

    setNewKey(trimmedKey)
    setNewValue(trimmedValue)

    const keyError = validateKey(trimmedKey)
    const valueError = validateValue(trimmedValue)

    const newErrors: FieldErrors = {}
    if (keyError) newErrors.key = keyError
    if (valueError) newErrors.value = valueError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setGeneralError(t`Please fix the validation errors below.`)
      return
    }

    if (!flavor?.id) {
      setGeneralError(t`Flavor ID is missing.`)
      return
    }

    try {
      setIsLoading(true)
      // Use trimmed values for the API call
      const extra_specs = { [trimmedKey]: trimmedValue }

      await client.compute.createExtraSpecs.mutate({
        projectId: project,
        flavorId: flavor.id,
        extra_specs: extra_specs,
      })

      // Update local state with trimmed values
      setExtraSpecs((prev) => ({ [trimmedKey]: trimmedValue, ...prev }))
      setSuccessMessage(t`Extra spec "${trimmedKey}" has been added successfully.`)
      setNewKey("")
      setNewValue("")
      setIsAddingSpec(false)
      setErrors({})
    } catch (error) {
      console.error("Failed to create extra spec:", error)
      const errorMessage = (error as Error)?.message
        ? translateError((error as Error).message)
        : t`Failed to create extra spec. Please try again.`
      setGeneralError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setNewKey("")
    setNewValue("")
    setIsAddingSpec(false)
    setErrors({})
    setGeneralError(null)
    setSuccessMessage(null)
  }

  const handleDeleteSpec = async (key: string) => {
    if (!flavor?.id) {
      setGeneralError(t`Flavor ID is missing.`)
      return
    }

    try {
      setIsDeleting(key)

      await client.compute.deleteExtraSpec.mutate({
        projectId: project,
        flavorId: flavor.id,
        key: key, // Key should already be trimmed from when it was created
      })

      setExtraSpecs((prev) => {
        const newSpecs = { ...prev }
        delete newSpecs[key]
        return newSpecs
      })

      setSuccessMessage(t`Extra spec "${key}" has been deleted successfully.`)
    } catch (error) {
      console.error("Failed to delete extra spec:", error)
      const errorMessage = (error as Error)?.message
        ? translateError((error as Error).message)
        : t`Failed to delete extra spec "${key}". Please try again.`
      setGeneralError(errorMessage)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Modal onCancel={handleClose} title={t`Edit Extra Specs`} open={isOpen} size="large">
      <div>
        {generalError && <Message onDismiss={dismissError} text={generalError} variant="error" className="mb-4" />}

        {successMessage && (
          <Message onDismiss={dismissSuccess} text={successMessage} variant="success" className="mb-4" />
        )}

        {flavor && (
          <>
            <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
              <Button
                icon="addCircle"
                label={t`Add Extra Spec`}
                onClick={handleAddSpec}
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
                <DataGridRow>
                  <DataGridCell className="pl-0">
                    <TextInput
                      value={newKey}
                      onChange={handleKeyChange}
                      onBlur={handleKeyBlur}
                      placeholder={t`Enter key`}
                      errortext={errors.key}
                      required
                    />
                  </DataGridCell>
                  <DataGridCell className="pl-0">
                    <TextInput
                      value={newValue}
                      onChange={handleValueChange}
                      onBlur={handleValueBlur}
                      placeholder={t`Enter value`}
                      errortext={errors.value}
                      required
                    />
                  </DataGridCell>
                  <DataGridCell>
                    <ButtonRow>
                      <Button
                        icon="check"
                        onClick={handleSave}
                        variant="primary"
                        title={t`Save Extra Spec`}
                        disabled={isLoading}
                      />
                      <Button icon="cancel" onClick={handleCancel} title={t`Cancel`} disabled={isLoading} />
                    </ButtonRow>
                  </DataGridCell>
                </DataGridRow>
              )}

              {Object.entries(extraSpecs).map(([key, value]) => (
                <DataGridRow key={key}>
                  <DataGridCell>{key}</DataGridCell>
                  <DataGridCell>{value}</DataGridCell>
                  <DataGridCell>
                    {isDeleting === key ? (
                      <Stack distribution="center" alignment="center">
                        <Spinner variant="primary" />
                      </Stack>
                    ) : (
                      <Button
                        icon="deleteForever"
                        variant="subdued"
                        onClick={() => handleDeleteSpec(key)}
                        title={t`Delete ${key}`}
                        disabled={isDeleting === key}
                      />
                    )}
                  </DataGridCell>
                </DataGridRow>
              ))}

              {(isLoading || isLoadingSpecs) && (
                <DataGridRow>
                  <DataGridCell colSpan={3}>
                    <Stack distribution="center" alignment="center">
                      <Spinner variant="primary" />
                    </Stack>
                  </DataGridCell>
                </DataGridRow>
              )}
              {!isLoading && !isLoadingSpecs && Object.keys(extraSpecs).length === 0 && !isAddingSpec && (
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

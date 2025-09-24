import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Message,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { validateField, FlavorFormField, FieldErrors } from "./flavorValidation"
import { cleanFlavorData } from "./flavorValidation"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"

interface CreateFlavorModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  onSuccess: (name: string) => void
}

export const CreateFlavorModal: React.FC<CreateFlavorModalProps> = ({
  client,
  isOpen,
  onClose,
  project,
  onSuccess,
}) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()
  const [newFlavor, setNewFlavor] = useState<Partial<Flavor>>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewFlavor((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (generalError) setGeneralError(null)
  }

  const handleNumericInputChange = (name: FlavorFormField, value: number | undefined) => {
    setNewFlavor((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (generalError) setGeneralError(null)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const error = validateField(name as FlavorFormField, value, t)
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    const newErrors: FieldErrors = {}

    const requiredFields: FlavorFormField[] = ["name", "vcpus", "ram", "disk"]
    requiredFields.forEach((key) => {
      const error = validateField(key, newFlavor[key], t)
      if (error) {
        newErrors[key] = error
      }
    })

    const optionalFields: FlavorFormField[] = ["id", "swap", "OS-FLV-EXT-DATA:ephemeral", "rxtx_factor", "description"]
    optionalFields.forEach((key) => {
      const value = newFlavor[key]
      if (value !== undefined && value !== "" && value !== null) {
        const error = validateField(key, value, t)
        if (error) {
          newErrors[key] = error
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setGeneralError(t`Please fix the validation errors below.`)
      return
    }

    try {
      setIsLoading(true)

      const flavorData = cleanFlavorData(newFlavor)

      await client.compute.createFlavor.mutate({
        projectId: project,
        flavor: flavorData,
      })

      onSuccess(flavorData.name)
      handleClose()
    } catch (error: any) {
      console.error("Failed to create flavor:", error)
      const errorMessage = error?.message
        ? translateError(error.message)
        : t`Failed to create flavor. Please try again.`
      setGeneralError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewFlavor({})
    setErrors({})
    setGeneralError(null)
    onClose()
  }

  const dismissError = () => {
    setGeneralError(null)
  }

  return (
    <Modal
      onCancel={handleClose}
      size="large"
      title={t`Create Flavor`}
      open={isOpen}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Create New Flavor`}
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}
      {!isLoading && (
        <Form>
          {generalError && (
            <FormRow>
              <Message onDismiss={dismissError} text={generalError} variant="error" />
            </FormRow>
          )}

          <FormSection>
            <FormRow>
              <TextInput
                id="id"
                name="id"
                label={t`Flavor ID`}
                value={newFlavor.id || ""}
                onChange={handleInputChange}
                onBlur={handleBlur}
                errortext={errors.id}
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="name"
                name="name"
                label={t`Flavor Name`}
                value={newFlavor.name || ""}
                onChange={handleInputChange}
                onBlur={handleBlur}
                errortext={errors.name}
                required
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="description"
                name="description"
                label={t`Description`}
                value={newFlavor.description || ""}
                onChange={handleInputChange}
                onBlur={handleBlur}
                errortext={errors.description}
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="vcpus"
                name="vcpus"
                label={t`VCPUs`}
                value={String(newFlavor.vcpus || "")}
                onChange={(e) => handleNumericInputChange("vcpus", Number(e.target.value))}
                onBlur={handleBlur}
                errortext={errors.vcpus}
                type="number"
                required
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="ram"
                name="ram"
                label={t`RAM (MiB)`}
                value={String(newFlavor.ram || "")}
                onChange={(e) => handleNumericInputChange("ram", Number(e.target.value))}
                onBlur={handleBlur}
                errortext={errors.ram}
                type="number"
                required
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="disk"
                name="disk"
                label={t`Disk (GiB)`}
                value={String(newFlavor.disk || "")}
                onChange={(e) => handleNumericInputChange("disk", Number(e.target.value))}
                onBlur={handleBlur}
                errortext={errors.disk}
                type="number"
                required
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="OS-FLV-EXT-DATA:ephemeral"
                name="OS-FLV-EXT-DATA:ephemeral"
                label={t`Ephemeral Disk (GiB)`}
                value={String(newFlavor["OS-FLV-EXT-DATA:ephemeral"] || "")}
                onChange={(e) => handleNumericInputChange("OS-FLV-EXT-DATA:ephemeral", Number(e.target.value))}
                onBlur={handleBlur}
                errortext={errors["OS-FLV-EXT-DATA:ephemeral"]}
                type="number"
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="swap"
                name="swap"
                label={t`Swap (MiB)`}
                value={String(newFlavor.swap || "")}
                onChange={(e) => handleNumericInputChange("swap", e.target.value ? Number(e.target.value) : undefined)}
                onBlur={handleBlur}
                errortext={errors.swap}
                type="number"
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="rxtx_factor"
                name="rxtx_factor"
                label={t`RX/TX Factor`}
                defaultValue={1}
                value={String(newFlavor.rxtx_factor || "")}
                onChange={(e) => handleNumericInputChange("rxtx_factor", Number(e.target.value))}
                onBlur={handleBlur}
                errortext={errors.rxtx_factor}
                type="number"
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

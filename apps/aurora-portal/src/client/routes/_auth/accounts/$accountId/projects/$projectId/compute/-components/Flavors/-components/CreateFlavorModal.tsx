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

interface CreateFlavorModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  onSuccess: (name: string) => void
}

type FlavorFormField =
  | "id"
  | "name"
  | "vcpus"
  | "ram"
  | "disk"
  | "swap"
  | "description"
  | "rxtx_factor"
  | "OS-FLV-EXT-DATA:ephemeral"

const defaultFlavorValues: Partial<Flavor> = {
  id: "",
  name: "",
  vcpus: 1,
  ram: 128,
  disk: 0,
  swap: 0,
  description: "",
  rxtx_factor: 1,
  "OS-FLV-EXT-DATA:ephemeral": 0,
}

interface FieldErrors {
  id?: string
  name?: string
  vcpus?: string
  ram?: string
  disk?: string
  swap?: string
  rxtx_factor?: string
  description?: string
  "OS-FLV-EXT-DATA:ephemeral"?: string
}

export const CreateFlavorModal: React.FC<CreateFlavorModalProps> = ({
  client,
  isOpen,
  onClose,
  project,
  onSuccess,
}) => {
  const { t } = useLingui()
  const [newFlavor, setNewFlavor] = useState<Partial<Flavor>>({ ...defaultFlavorValues })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const validateField = (field: FlavorFormField, value: string | number | null | undefined): string | undefined => {
    switch (field) {
      case "id":
        if (!value) return undefined
        {
          const idStr = String(value).trim()
          const idRegex = /^[a-zA-Z0-9.\-_ ]*$/
          return idRegex.test(idStr)
            ? undefined
            : t`ID must only contain alphanumeric characters, hyphens, underscores, spaces, and dots.`
        }

      case "name": {
        const nameStr = String(value || "").trim()
        return nameStr.length >= 2 && nameStr.length <= 50 ? undefined : t`Name must be 2-50 characters long.`
      }

      case "vcpus": {
        const vcpus = Number(value)
        return !isNaN(vcpus) && vcpus >= 1 ? undefined : t`VCPUs must be an integer ≥ 1.`
      }

      case "ram": {
        const ram = Number(value)
        return !isNaN(ram) && ram >= 128 ? undefined : t`RAM must be an integer ≥ 128 MB.`
      }

      case "disk": {
        const disk = Number(value)
        return !isNaN(disk) && disk >= 0 ? undefined : t`Root Disk must be an integer ≥ 0.`
      }

      case "swap":
        if (value === "" || value === undefined || value === null) return undefined
        {
          const swap = Number(value)
          return !isNaN(swap) && swap >= 0 ? undefined : t`Swap Disk must be an integer ≥ 0.`
        }

      case "rxtx_factor": {
        const rxtx = Number(value)
        return !isNaN(rxtx) && rxtx >= 1 ? undefined : t`RX/TX Factor must be an integer ≥ 1.`
      }

      case "description":
        if (!value) return undefined
        {
          const str = String(value)
          return str.length < 65535 ? undefined : t`Description must be less than 65535 characters.`
        }

      case "OS-FLV-EXT-DATA:ephemeral": {
        const ephemeral = Number(value)
        return !isNaN(ephemeral) && ephemeral >= 0 ? undefined : t`Ephemeral Disk must be an integer ≥ 0.`
      }

      default:
        return undefined
    }
  }

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
    const error = validateField(name as FlavorFormField, value)
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
      const error = validateField(key, newFlavor[key])
      if (error) {
        newErrors[key] = error
      }
    })

    const optionalFields: FlavorFormField[] = ["id", "swap", "OS-FLV-EXT-DATA:ephemeral", "rxtx_factor", "description"]
    optionalFields.forEach((key) => {
      const value = newFlavor[key]
      if (value !== undefined && value !== "" && value !== null) {
        const error = validateField(key, value)
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

      const flavorData = {
        ...newFlavor,
        name: String(newFlavor.name),
        vcpus: Number(newFlavor.vcpus),
        ram: Number(newFlavor.ram),
        disk: Number(newFlavor.disk),
        swap: Number(newFlavor.swap),
        "OS-FLV-EXT-DATA:ephemeral": Number(newFlavor["OS-FLV-EXT-DATA:ephemeral"]),
      }

      await client.compute.createFlavor.mutate({
        projectId: project,
        flavor: flavorData,
      })

      onSuccess(flavorData.name)
      handleClose()
    } catch (error) {
      console.error(error)
      setGeneralError(t`Failed to create flavor. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewFlavor({ ...defaultFlavorValues })
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

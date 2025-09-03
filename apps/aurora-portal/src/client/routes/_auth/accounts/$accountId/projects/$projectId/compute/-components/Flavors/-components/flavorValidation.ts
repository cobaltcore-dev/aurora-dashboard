import { MessageDescriptor } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

export const validateField = (
  field: FlavorFormField,
  value: string | number | null | undefined,
  t: (descriptor: MessageDescriptor) => string
): string | undefined => {
  switch (field) {
    case "id":
      if (!value) return undefined
      {
        const idStr = String(value).trim()
        const idRegex = /^[a-zA-Z0-9.\-_]*$/
        return idRegex.test(idStr)
          ? undefined
          : t({
              id: "validation.id.invalid",
              message: "ID must only contain alphanumeric characters, hyphens, underscores, and dots.",
            })
      }

    case "name": {
      const nameStr = String(value || "").trim()
      return nameStr.length >= 2 && nameStr.length <= 50
        ? undefined
        : t({
            id: "validation.name.length",
            message: "Name must be 2-50 characters long.",
          })
    }

    case "vcpus": {
      const vcpus = Number(value)
      return !isNaN(vcpus) && vcpus >= 1
        ? undefined
        : t({
            id: "validation.vcpus.invalid",
            message: "VCPUs must be an integer ≥ 1.",
          })
    }

    case "ram": {
      const ram = Number(value)
      return !isNaN(ram) && ram >= 128
        ? undefined
        : t({
            id: "validation.ram.invalid",
            message: "RAM must be an integer ≥ 128 MB.",
          })
    }

    case "disk": {
      const disk = Number(value)
      return !isNaN(disk) && disk >= 0
        ? undefined
        : t({
            id: "validation.disk.invalid",
            message: "Root Disk must be an integer ≥ 0.",
          })
    }

    case "swap":
      if (value === "" || value === undefined || value === null) return undefined
      {
        const swap = Number(value)
        return !isNaN(swap) && swap >= 0
          ? undefined
          : t({
              id: "validation.swap.invalid",
              message: "Swap Disk must be an integer ≥ 0.",
            })
      }

    case "rxtx_factor": {
      const rxtx = Number(value)
      return !isNaN(rxtx) && rxtx >= 1
        ? undefined
        : t({
            id: "validation.rxtx_factor.invalid",
            message: "RX/TX Factor must be an integer ≥ 1.",
          })
    }

    case "description":
      if (!value) return undefined
      {
        const str = String(value)
        return str.length < 65535
          ? undefined
          : t({
              id: "validation.description.too_long",
              message: "Description must be less than 65535 characters.",
            })
      }

    case "OS-FLV-EXT-DATA:ephemeral": {
      const ephemeral = Number(value)
      return !isNaN(ephemeral) && ephemeral >= 0
        ? undefined
        : t({
            id: "validation.ephemeral.invalid",
            message: "Ephemeral Disk must be an integer ≥ 0.",
          })
    }

    default:
      return undefined
  }
}

export type FlavorFormField =
  | "id"
  | "name"
  | "vcpus"
  | "ram"
  | "disk"
  | "swap"
  | "description"
  | "rxtx_factor"
  | "OS-FLV-EXT-DATA:ephemeral"

export interface FieldErrors {
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

export const cleanFlavorData = (flavor: Partial<Flavor>) => {
  const result: {
    name: string
    vcpus: number
    ram: number
    disk: number
    "OS-FLV-EXT-DATA:ephemeral"?: number
    id?: string
    swap?: number
    rxtx_factor?: number
    description?: string
  } = {
    name: String(flavor.name),
    vcpus: Number(flavor.vcpus),
    ram: Number(flavor.ram),
    disk: Number(flavor.disk),
  }

  const isValidValue = (value: string | undefined | null) => {
    return value !== undefined && value !== null && value !== "" && String(value).trim() !== ""
  }

  const isValidNumber = (value: string | number | undefined | null) => {
    return value !== undefined && value !== null && value !== "" && String(value).trim() !== "" && !isNaN(Number(value))
  }

  if (isValidValue(flavor.id)) {
    result.id = String(flavor.id).trim()
  }

  if (isValidValue(flavor.description)) {
    result.description = String(flavor.description).trim()
  }

  if (isValidNumber(flavor.swap)) {
    result.swap = Number(flavor.swap)
  }

  if (isValidNumber(flavor.rxtx_factor)) {
    result.rxtx_factor = Number(flavor.rxtx_factor)
  }

  if (isValidNumber(flavor["OS-FLV-EXT-DATA:ephemeral"])) {
    result["OS-FLV-EXT-DATA:ephemeral"] = Number(flavor["OS-FLV-EXT-DATA:ephemeral"])
  }

  return result
}

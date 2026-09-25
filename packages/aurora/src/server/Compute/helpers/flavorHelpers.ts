import { TRPCError } from "@trpc/server"
import { flavorResponseSchema, Flavor, CreateFlavorInput } from "../types/flavor"
import { ERROR_CODES } from "../../errorCodes"
import {
  SignalOpenstackServiceType,
  validateAndEncodeResourceId,
  encodeOpenstackPathSegment,
  SignalOpenstackError,
} from "@cobaltcore-dev/signal-openstack"

interface CreateFlavorResponse {
  flavor: Flavor
}

export interface FlavorAccess {
  flavor_id: string
  tenant_id: string
}

interface FlavorAccessResponse {
  flavor_access: FlavorAccess[]
}

type TRPCErrorConfig = ConstructorParameters<typeof TRPCError>[0]
type TRPCErrorCode = TRPCErrorConfig["code"]

// Type guard for errors with statusCode
interface ErrorWithStatus {
  statusCode?: number
  status?: number
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return typeof error === "object" && error !== null && ("statusCode" in error || "status" in error)
}

function getStatusCodeFromError(error: unknown): number | undefined {
  if (isErrorWithStatus(error)) {
    return error.statusCode ?? error.status
  }
  return undefined
}

const GET_FLAVOR_DETAILS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.GET_FLAVOR_DETAILS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.GET_FLAVOR_DETAILS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.GET_FLAVOR_DETAILS_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_DETAILS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_DETAILS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_DETAILS_SERVER_ERROR },
}

const FETCH_FLAVORS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.FLAVORS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.FLAVORS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.FLAVORS_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.FLAVORS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.FLAVORS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.FLAVORS_SERVER_ERROR },
}

const CREATE_FLAVOR_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  400: { code: "BAD_REQUEST", message: ERROR_CODES.CREATE_FLAVOR_INVALID_DATA },
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.CREATE_FLAVOR_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.CREATE_FLAVOR_FORBIDDEN },
  409: { code: "CONFLICT", message: ERROR_CODES.CREATE_FLAVOR_CONFLICT },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR },
}

const DELETE_FLAVOR_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.DELETE_FLAVOR_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.DELETE_FLAVOR_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.DELETE_FLAVOR_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_FLAVOR_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_FLAVOR_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_FLAVOR_SERVER_ERROR },
}

const CREATE_EXTRA_SPECS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  400: { code: "BAD_REQUEST", message: ERROR_CODES.CREATE_EXTRA_SPECS_INVALID_DATA },
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.CREATE_EXTRA_SPECS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.CREATE_EXTRA_SPECS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.CREATE_EXTRA_SPECS_NOT_FOUND },
  409: { code: "CONFLICT", message: ERROR_CODES.CREATE_EXTRA_SPECS_CONFLICT },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR },
}

const GET_EXTRA_SPECS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.GET_EXTRA_SPECS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.GET_EXTRA_SPECS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.GET_EXTRA_SPECS_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR },
}

const DELETE_EXTRA_SPEC_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  400: { code: "BAD_REQUEST", message: ERROR_CODES.DELETE_EXTRA_SPEC_INVALID_KEY },
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.DELETE_EXTRA_SPEC_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.DELETE_EXTRA_SPEC_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.DELETE_EXTRA_SPEC_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR },
}

const GET_FLAVOR_ACCESS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.GET_FLAVOR_ACCESS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.GET_FLAVOR_ACCESS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.GET_FLAVOR_ACCESS_NOT_FOUND },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_ACCESS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_ACCESS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.GET_FLAVOR_ACCESS_SERVER_ERROR },
}

const ADD_TENANT_ACCESS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  400: { code: "BAD_REQUEST", message: ERROR_CODES.ADD_TENANT_ACCESS_INVALID_DATA },
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.ADD_TENANT_ACCESS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.ADD_TENANT_ACCESS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.ADD_TENANT_ACCESS_NOT_FOUND },
  409: { code: "CONFLICT", message: ERROR_CODES.ADD_TENANT_ACCESS_CONFLICT },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.ADD_TENANT_ACCESS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.ADD_TENANT_ACCESS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.ADD_TENANT_ACCESS_SERVER_ERROR },
}

const REMOVE_TENANT_ACCESS_STATUS_MAP: Record<number, { code: TRPCErrorCode; message: string }> = {
  400: { code: "BAD_REQUEST", message: ERROR_CODES.REMOVE_TENANT_ACCESS_INVALID_DATA },
  401: { code: "UNAUTHORIZED", message: ERROR_CODES.REMOVE_TENANT_ACCESS_UNAUTHORIZED },
  403: { code: "FORBIDDEN", message: ERROR_CODES.REMOVE_TENANT_ACCESS_FORBIDDEN },
  404: { code: "NOT_FOUND", message: ERROR_CODES.REMOVE_TENANT_ACCESS_NOT_FOUND },
  409: { code: "CONFLICT", message: ERROR_CODES.REMOVE_TENANT_ACCESS_CONFLICT },
  500: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.REMOVE_TENANT_ACCESS_SERVER_ERROR },
  502: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.REMOVE_TENANT_ACCESS_SERVER_ERROR },
  503: { code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.REMOVE_TENANT_ACCESS_SERVER_ERROR },
}

function handleHttpError(
  statusCode: number | undefined,
  statusMap: Record<number, { code: TRPCErrorCode; message: string }>,
  defaultMessage: string
): never {
  if (statusCode === undefined) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: defaultMessage,
    })
  }

  const errorConfig = statusMap[statusCode] || {
    code: "BAD_REQUEST" as TRPCErrorCode,
    message: defaultMessage,
  }

  throw new TRPCError(errorConfig)
}

export function includesSearchTerm(flavor: Flavor, searchTerm: string): boolean {
  const regex = new RegExp(searchTerm, "i")

  // Search across all visible fields in the flavor list: id, name, description, vcpus, ram, disk, swap
  const searchableValues = [
    flavor.id,
    flavor.name,
    flavor.description,
    flavor.vcpus,
    flavor.ram,
    flavor.disk,
    flavor.swap,
  ]

  return searchableValues.some((value) => {
    if (value == null) return false
    if (typeof value === "string") return regex.test(value)
    if (typeof value === "number") return regex.test(value.toString())
    return false
  })
}

export function filterAndSortFlavors(
  flavors: Flavor[],
  searchTerm: string,
  sortBy: keyof Flavor,
  sortDirection: string
): Flavor[] {
  let result = flavors

  if (searchTerm) {
    result = flavors.filter((flavor) => includesSearchTerm(flavor, searchTerm))
  }

  result.sort((a, b) => {
    const aValue = a[sortBy]
    const bValue = b[sortBy]

    if (aValue == null && bValue == null) return 0
    if (aValue == null) return sortDirection === "asc" ? 1 : -1
    if (bValue == null) return sortDirection === "asc" ? -1 : 1

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  return result
}

/**
 * Detect the maximum supported Nova API microversion
 */
async function getMaxMicroversion(compute: SignalOpenstackServiceType): Promise<string> {
  try {
    const response = await compute.get("")
    const data = await response.json()

    // The response can be either { version: {...} } or { versions: [...] }
    if (data.version) {
      return data.version.version || "2.1"
    } else if (data.versions) {
      const currentVersion = data.versions.find((v: { status: string }) => v.status === "CURRENT")
      return currentVersion?.version || "2.1"
    }
  } catch {
    // Fallback to 2.1 if detection fails
  }
  return "2.1"
}

export async function getFlavorById(compute: SignalOpenstackServiceType, flavorId: string): Promise<Flavor> {
  if (!flavorId || flavorId.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ERROR_CODES.GET_FLAVOR_DETAILS_INVALID_ID,
    })
  }

  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.GET_FLAVOR_DETAILS_INVALID_ID,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    // Detect max microversion and request with it if >= 2.55 (for description support)
    const maxVersion = await getMaxMicroversion(compute)
    const [major, minor] = maxVersion.split(".").map(Number)
    const supportsDescription = major > 2 || (major === 2 && minor >= 55)
    const options = supportsDescription ? { headers: { "OpenStack-API-Version": `compute ${maxVersion}` } } : undefined

    response = await compute.get(`flavors/${encodedId}`, options)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, GET_FLAVOR_DETAILS_STATUS_MAP, ERROR_CODES.GET_FLAVOR_DETAILS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, GET_FLAVOR_DETAILS_STATUS_MAP, ERROR_CODES.GET_FLAVOR_DETAILS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)

    if (!jsonData.flavor) {
      throw new TRPCError({
        code: "PARSE_ERROR",
        message: ERROR_CODES.GET_FLAVOR_DETAILS_PARSE_ERROR,
      })
    }

    return jsonData.flavor as Flavor
  } catch (error) {
    if (error instanceof TRPCError) throw error

    throw new TRPCError({
      code: "PARSE_ERROR",
      message: ERROR_CODES.GET_FLAVOR_DETAILS_PARSE_ERROR,
      cause: error,
    })
  }
}

export async function fetchFlavors(compute: SignalOpenstackServiceType, isPublic: string): Promise<Flavor[]> {
  let response

  try {
    // Detect max microversion and request with it if >= 2.55 (for description support)
    const maxVersion = await getMaxMicroversion(compute)
    const [major, minor] = maxVersion.split(".").map(Number)
    const supportsDescription = major > 2 || (major === 2 && minor >= 55)
    const options = supportsDescription
      ? {
          queryParams: { is_public: isPublic },
          headers: { "OpenStack-API-Version": `compute ${maxVersion}` },
        }
      : { queryParams: { is_public: isPublic } }

    response = await compute.get("flavors/detail", options)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, FETCH_FLAVORS_STATUS_MAP, ERROR_CODES.FLAVORS_FETCH_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, FETCH_FLAVORS_STATUS_MAP, ERROR_CODES.FLAVORS_FETCH_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)
    const parsedData = flavorResponseSchema.safeParse(jsonData)

    if (!parsedData.success) {
      throw new TRPCError({
        code: "PARSE_ERROR",
        message: ERROR_CODES.FLAVORS_PARSE_ERROR,
      })
    }
    return parsedData.data.flavors
  } catch (error) {
    if (error instanceof TRPCError) throw error

    throw new TRPCError({
      code: "PARSE_ERROR",
      message: ERROR_CODES.FLAVORS_PARSE_ERROR,
    })
  }
}

export async function createFlavor(
  compute: SignalOpenstackServiceType,
  flavorData: CreateFlavorInput,
  microversion?: string
): Promise<Flavor> {
  const requestBody = { flavor: flavorData }

  // If flavor has description and microversion is provided, use it
  const headers: Record<string, string> = {}
  if (microversion && flavorData.description) {
    const [major, minor] = microversion.split(".").map(Number)
    const supportsDescription = major > 2 || (major === 2 && minor >= 55)
    // Only send header if version supports description (>= 2.55)
    if (supportsDescription) {
      headers["OpenStack-API-Version"] = `compute ${microversion}`
    }
  }

  let response

  try {
    response = await compute.post("flavors", requestBody, Object.keys(headers).length ? { headers } : undefined)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)

    // Preserve the original error message for retry logic to inspect
    if (statusCode === 400) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      if (errorMessage.includes("description")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage,
          cause: error,
        })
      }
    }

    handleHttpError(statusCode, CREATE_FLAVOR_STATUS_MAP, ERROR_CODES.CREATE_FLAVOR_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, CREATE_FLAVOR_STATUS_MAP, ERROR_CODES.CREATE_FLAVOR_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData) as CreateFlavorResponse
    return jsonData.flavor
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.CREATE_FLAVOR_FAILED,
      cause: error,
    })
  }
}

export async function deleteFlavor(compute: SignalOpenstackServiceType, flavorId: string): Promise<void> {
  if (!flavorId || flavorId.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ERROR_CODES.DELETE_FLAVOR_INVALID_ID,
    })
  }

  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_FLAVOR_INVALID_ID,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    response = await compute.del(`flavors/${encodedId}`)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    console.error(`Failed to delete flavor ${flavorId}:`, error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.DELETE_FLAVOR_FAILED,
      cause: error,
    })
  }

  if (!response.ok) {
    handleHttpError(response.status, DELETE_FLAVOR_STATUS_MAP, ERROR_CODES.DELETE_FLAVOR_FAILED)
  }
}

export async function createExtraSpecs(
  compute: SignalOpenstackServiceType,
  flavorId: string,
  extra_specs: Record<string, string>
): Promise<Record<string, string>> {
  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    response = await compute.post(`flavors/${encodedId}/os-extra_specs`, {
      extra_specs: extra_specs,
    })
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, CREATE_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.CREATE_EXTRA_SPECS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, CREATE_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.CREATE_EXTRA_SPECS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)
    return jsonData.extra_specs
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
      cause: error,
    })
  }
}

export async function getExtraSpecs(
  compute: SignalOpenstackServiceType,
  flavorId: string
): Promise<Record<string, string>> {
  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    response = await compute.get(`flavors/${encodedId}/os-extra_specs`)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, GET_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.GET_EXTRA_SPECS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, GET_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.GET_EXTRA_SPECS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)
    return jsonData.extra_specs || {}
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
      cause: error,
    })
  }
}

export async function deleteExtraSpec(
  compute: SignalOpenstackServiceType,
  flavorId: string,
  key: string
): Promise<void> {
  let encodedId, encodedKey
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
    encodedKey = encodeOpenstackPathSegment(key, "Extra spec key")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    response = await compute.del(`flavors/${encodedId}/os-extra_specs/${encodedKey}`)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, DELETE_EXTRA_SPEC_STATUS_MAP, ERROR_CODES.DELETE_EXTRA_SPEC_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, DELETE_EXTRA_SPEC_STATUS_MAP, ERROR_CODES.DELETE_EXTRA_SPEC_FAILED)
  }
}

export async function getFlavorAccess(compute: SignalOpenstackServiceType, flavorId: string): Promise<FlavorAccess[]> {
  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.GET_FLAVOR_ACCESS_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    response = await compute.get(`flavors/${encodedId}/os-flavor-access`)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, GET_FLAVOR_ACCESS_STATUS_MAP, ERROR_CODES.GET_FLAVOR_ACCESS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, GET_FLAVOR_ACCESS_STATUS_MAP, ERROR_CODES.GET_FLAVOR_ACCESS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData) as FlavorAccessResponse
    return jsonData.flavor_access || []
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.GET_FLAVOR_ACCESS_FAILED,
      cause: error,
    })
  }
}

export async function addTenantAccess(
  compute: SignalOpenstackServiceType,
  flavorId: string,
  tenantId: string
): Promise<FlavorAccess[]> {
  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.ADD_TENANT_ACCESS_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    const requestBody = {
      addTenantAccess: {
        tenant: tenantId,
      },
    }
    response = await compute.post(`flavors/${encodedId}/action`, requestBody)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, ADD_TENANT_ACCESS_STATUS_MAP, ERROR_CODES.ADD_TENANT_ACCESS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, ADD_TENANT_ACCESS_STATUS_MAP, ERROR_CODES.ADD_TENANT_ACCESS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData) as FlavorAccessResponse
    return jsonData.flavor_access || []
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.ADD_TENANT_ACCESS_FAILED,
      cause: error,
    })
  }
}

export async function removeTenantAccess(
  compute: SignalOpenstackServiceType,
  flavorId: string,
  tenantId: string
): Promise<FlavorAccess[]> {
  let encodedId
  try {
    encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
  } catch (error) {
    if (error instanceof SignalOpenstackError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.REMOVE_TENANT_ACCESS_FAILED,
        cause: error,
      })
    }
    throw error
  }

  let response

  try {
    const requestBody = {
      removeTenantAccess: {
        tenant: tenantId,
      },
    }
    response = await compute.post(`flavors/${encodedId}/action`, requestBody)
  } catch (error) {
    if (error instanceof TRPCError) throw error

    const statusCode = getStatusCodeFromError(error)
    handleHttpError(statusCode, REMOVE_TENANT_ACCESS_STATUS_MAP, ERROR_CODES.REMOVE_TENANT_ACCESS_FAILED)
  }

  if (!response.ok) {
    handleHttpError(response.status, REMOVE_TENANT_ACCESS_STATUS_MAP, ERROR_CODES.REMOVE_TENANT_ACCESS_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData) as FlavorAccessResponse
    return jsonData.flavor_access || []
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.REMOVE_TENANT_ACCESS_FAILED,
      cause: error,
    })
  }
}

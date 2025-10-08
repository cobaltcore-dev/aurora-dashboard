import { TRPCError } from "@trpc/server"
import { flavorResponseSchema, Flavor, CreateFlavorInput } from "../types/flavor"
import { ERROR_CODES } from "../../errorCodes"

interface ServiceOptions {
  [key: string]: unknown
}

interface ComputeService {
  del(path: string, options?: ServiceOptions): Promise<Response>
  get(path: string, options?: ServiceOptions): Promise<Response>
  post(path: string, values: string | object | undefined, options?: ServiceOptions): Promise<Response>
}

interface CreateFlavorResponse {
  flavor: Flavor
}

type TRPCErrorConfig = ConstructorParameters<typeof TRPCError>[0]
type TRPCErrorCode = TRPCErrorConfig["code"]

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

function handleHttpError(
  response: Response,
  statusMap: Record<number, { code: TRPCErrorCode; message: string }>,
  defaultMessage: string
): never {
  const statusCode = response.status
  const errorConfig = statusMap[statusCode] || {
    code: "BAD_REQUEST" as TRPCErrorCode,
    message: defaultMessage,
  }

  throw new TRPCError(errorConfig)
}

export function includesSearchTerm(flavor: Flavor, searchTerm: string): boolean {
  const regex = new RegExp(searchTerm, "i")
  const searchableValues = [flavor.id, flavor.name, flavor.description]

  return searchableValues.some((value) => value != null && typeof value === "string" && regex.test(value))
}

export async function fetchFlavors(compute: ComputeService): Promise<Flavor[]> {
  const response = await compute.get("flavors/detail")

  if (!response.ok) {
    handleHttpError(response, FETCH_FLAVORS_STATUS_MAP, ERROR_CODES.FLAVORS_FETCH_FAILED)
  }

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
export async function createFlavor(compute: ComputeService, flavorData: CreateFlavorInput): Promise<Flavor> {
  const requestBody = {
    flavor: flavorData,
  }

  const response = await compute.post("flavors", requestBody)

  if (!response.ok) {
    handleHttpError(response, CREATE_FLAVOR_STATUS_MAP, ERROR_CODES.CREATE_FLAVOR_FAILED)
  }

  try {
    const rawData = await response.text()
    const jsonData = JSON.parse(rawData) as CreateFlavorResponse
    return jsonData.flavor
  } catch (error) {
    console.error("Error parsing flavor response:", error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.CREATE_FLAVOR_FAILED,
      cause: error,
    })
  }
}
export async function deleteFlavor(compute: ComputeService, flavorId: string): Promise<void> {
  if (!flavorId || flavorId.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ERROR_CODES.DELETE_FLAVOR_INVALID_ID,
    })
  }
  try {
    const response = await compute.del(`flavors/${flavorId}`)

    if (!response.ok) {
      handleHttpError(response, DELETE_FLAVOR_STATUS_MAP, ERROR_CODES.DELETE_FLAVOR_FAILED)
    }
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    console.error(`Failed to delete flavor ${flavorId}:`, error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.DELETE_FLAVOR_FAILED,
      cause: error,
    })
  }
}
export async function createExtraSpecs(
  compute: ComputeService,
  flavorId: string,
  extra_specs: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const response = await compute.post(`flavors/${flavorId}/os-extra_specs`, {
      extra_specs: extra_specs,
    })

    if (!response.ok) {
      handleHttpError(response, CREATE_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.CREATE_EXTRA_SPECS_FAILED)
    }

    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)

    return jsonData.extra_specs
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
      cause: error,
    })
  }
}
export async function getExtraSpecs(compute: ComputeService, flavorId: string): Promise<Record<string, string>> {
  try {
    const response = await compute.get(`flavors/${flavorId}/os-extra_specs`)

    if (!response.ok) {
      handleHttpError(response, GET_EXTRA_SPECS_STATUS_MAP, ERROR_CODES.GET_EXTRA_SPECS_FAILED)
    }

    const rawData = await response.text()
    const jsonData = JSON.parse(rawData)

    return jsonData.extra_specs || {}
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
      cause: error,
    })
  }
}

export async function deleteExtraSpec(compute: ComputeService, flavorId: string, key: string): Promise<void> {
  try {
    const response = await compute.del(`flavors/${flavorId}/os-extra_specs/${key}`)

    if (!response.ok) {
      handleHttpError(response, DELETE_EXTRA_SPEC_STATUS_MAP, ERROR_CODES.DELETE_EXTRA_SPEC_FAILED)
    }
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
      cause: error,
    })
  }
}

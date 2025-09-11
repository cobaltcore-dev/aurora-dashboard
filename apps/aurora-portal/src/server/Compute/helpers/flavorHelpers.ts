import { TRPCError } from "@trpc/server"
import { flavorResponseSchema, Flavor, CreateFlavorInput } from "../types/flavor"
import { ERROR_CODES } from "../../errorCodes"

interface ComputeService {
  del(path: string): Promise<Response>
  get(path: string): Promise<Response>
  post(path: string, body: { flavor: CreateFlavorInput }): Promise<Response> // Updated to accept body
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

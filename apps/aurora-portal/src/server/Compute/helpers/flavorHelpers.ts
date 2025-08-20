import { TRPCError } from "@trpc/server"
import { flavorResponseSchema, Flavor } from "../types/flavor"
import { ERROR_CODES } from "../../errorCodes"

interface ComputeService {
  get(path: string): Promise<Response>
}

export function includesSearchTerm(flavor: Flavor, searchTerm: string): boolean {
  const regex = new RegExp(searchTerm, "i")
  const searchableValues = [flavor.id, flavor.name, flavor.description]

  return searchableValues.some((value) => value != null && typeof value === "string" && regex.test(value))
}

export async function fetchFlavors(compute: ComputeService): Promise<Flavor[]> {
  const response = await compute.get("/compute/v2.1/flavors/detail")
  if (!response.ok) {
    const statusCode = response.status

    switch (statusCode) {
      case 401:
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: ERROR_CODES.FLAVORS_UNAUTHORIZED,
        })
      case 403:
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ERROR_CODES.FLAVORS_FORBIDDEN,
        })
      case 404:
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ERROR_CODES.FLAVORS_NOT_FOUND,
        })
      case 500:
      case 502:
      case 503:
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.FLAVORS_SERVER_ERROR,
        })
      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: ERROR_CODES.FLAVORS_FETCH_FAILED,
        })
    }
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

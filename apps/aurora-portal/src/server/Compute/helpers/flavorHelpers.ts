import { flavorResponseSchema, Flavor } from "../types/flavor"

export function includesSearchTerm(flavor: Flavor, searchTerm: string): boolean {
  const regex = new RegExp(searchTerm, "i")
  return [flavor.name, flavor.description, ...Object.values(flavor.extra_specs || {})].some(
    (value) => typeof value === "string" && regex.test(value)
  )
}

export async function getComputeService(ctx: any, projectId: string) {
  const openstackSession = await ctx.rescopeSession({ projectId })
  const compute = openstackSession?.service("compute")

  if (!compute) {
    throw new Error("Compute service not available")
  }

  return compute
}

export async function fetchFlavors(compute: any): Promise<Flavor[]> {
  const response = await compute.get("/compute/v2.1/flavors/detail")
  const rawData = await response.text()
  const jsonData = JSON.parse(rawData)

  const parsedData = flavorResponseSchema.safeParse(jsonData)

  if (!parsedData.success) {
    throw new Error(`Zod Parsing Error: ${JSON.stringify(parsedData.error.format(), null, 2)}`)
  }

  return parsedData.data.flavors
}

export function filterAndSortFlavors(
  flavors: Flavor[],
  searchTerm: string,
  sortBy: keyof Flavor,
  sortDirection: string
): Flavor[] {
  const result = flavors.filter((flavor) => includesSearchTerm(flavor, searchTerm))

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

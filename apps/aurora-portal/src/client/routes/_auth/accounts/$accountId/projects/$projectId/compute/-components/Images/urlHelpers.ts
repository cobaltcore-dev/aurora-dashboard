import { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"

type ImagesSearchParams = {
  status?: string
  visibility?: string
  disk_format?: string
  container_format?: string
  protected?: string
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
  memberStatus?: "all" | "accepted" | "pending"
}

/**
 * Parses URL search params into SelectedFilter array for ListToolbar
 */
export const parseFiltersFromUrl = (searchParams: ImagesSearchParams): SelectedFilter[] => {
  const filters: SelectedFilter[] = []

  // Status filter
  if (searchParams.status) {
    const values = searchParams.status.startsWith("in:")
      ? searchParams.status.replace("in:", "").split(",")
      : [searchParams.status]
    values.forEach((value: string) => {
      filters.push({ name: "status", value })
    })
  }

  // Visibility filter
  if (searchParams.visibility) {
    filters.push({ name: "visibility", value: searchParams.visibility })
  }

  // Disk format filter
  if (searchParams.disk_format) {
    const values = searchParams.disk_format.startsWith("in:")
      ? searchParams.disk_format.replace("in:", "").split(",")
      : [searchParams.disk_format]
    values.forEach((value: string) => {
      filters.push({ name: "disk_format", value })
    })
  }

  // Container format filter
  if (searchParams.container_format) {
    const values = searchParams.container_format.startsWith("in:")
      ? searchParams.container_format.replace("in:", "").split(",")
      : [searchParams.container_format]
    values.forEach((value: string) => {
      filters.push({ name: "container_format", value })
    })
  }

  // Protected filter
  if (searchParams.protected) {
    filters.push({ name: "protected", value: searchParams.protected })
  }

  return filters
}

/**
 * Builds filter parameters for API request from SelectedFilter array
 */
export const buildFilterParams = (
  selectedFilters: SelectedFilter[],
  filterDefinitions: Filter[]
): Record<string, string> => {
  const params: Record<string, string> = {}

  if (!selectedFilters?.length) return params

  // Group selected filters by filter name
  const filterGroups = selectedFilters
    .filter((sf) => !sf.inactive)
    .reduce(
      (acc, sf) => {
        if (!acc[sf.name]) acc[sf.name] = []
        acc[sf.name].push(sf.value)
        return acc
      },
      {} as Record<string, string[]>
    )

  // Build parameters based on whether filter supports multiple values
  Object.entries(filterGroups).forEach(([filterName, values]) => {
    const filterDef = filterDefinitions.find((f) => f.filterName === filterName)

    if (filterDef?.supportsMultiValue && values.length > 1) {
      params[filterName] = `in:${values.join(",")}`
    } else {
      params[filterName] = values[0]
    }
  })

  return params
}

/**
 * Builds URL search params object from filter settings for navigation
 */
export const buildUrlSearchParams = (
  selectedFilters: SelectedFilter[],
  filterDefinitions: Filter[],
  baseParams: { search?: string; sortBy?: string; sortDirection?: "asc" | "desc"; memberStatus?: "all" | "accepted" | "pending" }
): ImagesSearchParams => {
  const newParams: ImagesSearchParams = {
    search: baseParams.search,
    sortBy: baseParams.sortBy,
    sortDirection: baseParams.sortDirection,
    memberStatus: baseParams.memberStatus === "all" ? undefined : baseParams.memberStatus,
  }

  if (!selectedFilters?.length) return newParams

  const filterGroups = selectedFilters
    .filter((sf) => !sf.inactive)
    .reduce(
      (acc, sf) => {
        if (!acc[sf.name]) acc[sf.name] = []
        acc[sf.name].push(sf.value)
        return acc
      },
      {} as Record<string, string[]>
    )

  Object.entries(filterGroups).forEach(([filterName, values]) => {
    const filterDef = filterDefinitions.find((f) => f.filterName === filterName)

    if (filterDef?.supportsMultiValue && values.length > 1) {
      // Type assertion needed because we're dynamically setting filter fields
      ;(newParams as Record<string, string>)[filterName] = `in:${values.join(",")}`
    } else {
      ;(newParams as Record<string, string>)[filterName] = values[0]
    }
  })

  return newParams
}

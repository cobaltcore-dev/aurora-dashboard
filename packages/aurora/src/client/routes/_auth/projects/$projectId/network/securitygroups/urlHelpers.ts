import { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"

type SecurityGroupsSearchParams = {
  shared?: string
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

/**
 * Parses URL search params into SelectedFilter array for ListToolbar
 */
export const parseFiltersFromUrl = (searchParams: SecurityGroupsSearchParams): SelectedFilter[] => {
  const filters: SelectedFilter[] = []

  // Shared filter
  if (searchParams.shared) {
    filters.push({ name: "shared", value: searchParams.shared })
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
 * Merges a newly selected filter into the current list.
 * - Ignores duplicates (same name + value).
 * - For single-value filters, replaces any existing entry with the same name.
 * - For multi-value filters, appends.
 */
export const applyFilterSelection = (
  current: SelectedFilter[],
  selected: SelectedFilter,
  filterDefinitions: Filter[]
): SelectedFilter[] => {
  const alreadySelected = current.some((f) => f.name === selected.name && f.value === selected.value)
  if (alreadySelected) return current

  const supportsMulti = filterDefinitions.find((f) => f.filterName === selected.name)?.supportsMultiValue
  return supportsMulti ? [...current, selected] : [...current.filter((f) => f.name !== selected.name), selected]
}

/**
 * Builds URL search params object from filter settings for navigation
 */
export const buildUrlSearchParams = (
  selectedFilters: SelectedFilter[],
  filterDefinitions: Filter[],
  baseParams: {
    search?: string
    sortBy?: string
    sortDirection?: "asc" | "desc"
  }
): SecurityGroupsSearchParams => {
  const newParams: SecurityGroupsSearchParams = {
    search: baseParams.search,
    sortBy: baseParams.sortBy,
    sortDirection: baseParams.sortDirection,
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

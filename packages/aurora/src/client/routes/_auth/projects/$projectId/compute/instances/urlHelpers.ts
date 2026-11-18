import { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"
import type { InstancesSearchParams } from "@/client/routes/_auth/projects/$projectId/compute/instances"
import type { ServerFilterParams } from "./apiHelpers"

/** URL search param keys that back a filter facet (matches the table columns). */
export const FILTER_KEYS = ["power_state", "az"] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Maps a URL/filter key to the BFF query-param name. */
const API_PARAM_BY_KEY: Record<FilterKey, keyof ServerFilterParams> = {
  power_state: "power_state",
  az: "availability_zone",
}

const parseValues = (raw: string): string[] => (raw.startsWith("in:") ? raw.replace("in:", "").split(",") : [raw])

/** Parses URL search params into the ListToolbar SelectedFilter array. */
export const parseFiltersFromUrl = (searchParams: InstancesSearchParams): SelectedFilter[] => {
  const filters: SelectedFilter[] = []
  FILTER_KEYS.forEach((key) => {
    const raw = searchParams[key]
    if (raw) parseValues(raw).forEach((value) => filters.push({ name: key, value }))
  })
  return filters
}

/** Groups selected filters by name, encoding multi-value as "in:a,b,c". */
const groupFilters = (selectedFilters: SelectedFilter[], filterDefinitions: Filter[]): Record<string, string> => {
  const params: Record<string, string> = {}
  const groups = selectedFilters
    .filter((sf) => !sf.inactive)
    .reduce(
      (acc, sf) => {
        ;(acc[sf.name] ??= []).push(sf.value)
        return acc
      },
      {} as Record<string, string[]>
    )

  Object.entries(groups).forEach(([name, values]) => {
    const def = filterDefinitions.find((f) => f.filterName === name)
    params[name] = def?.supportsMultiValue && values.length > 1 ? `in:${values.join(",")}` : values[0]
  })
  return params
}

/** Builds the BFF filter params (keyed by API param name) from selected filters. */
export const buildFilterParams = (
  selectedFilters: SelectedFilter[],
  filterDefinitions: Filter[]
): ServerFilterParams => {
  const grouped = groupFilters(selectedFilters, filterDefinitions)
  const params: ServerFilterParams = {}
  Object.entries(grouped).forEach(([key, value]) => {
    params[API_PARAM_BY_KEY[key as FilterKey]] = value
  })
  return params
}

/** Builds the URL search-param fragment (keyed by URL key) from selected filters. */
export const buildUrlFilterParams = (
  selectedFilters: SelectedFilter[],
  filterDefinitions: Filter[]
): Partial<Record<FilterKey, string | undefined>> => {
  const cleared: Partial<Record<FilterKey, string | undefined>> = {}
  FILTER_KEYS.forEach((key) => (cleared[key] = undefined))
  return { ...cleared, ...groupFilters(selectedFilters, filterDefinitions) }
}

/**
 * Merges a newly selected filter into the current list.
 * - Ignores duplicates (same name + value).
 * - Single-value filters replace any existing entry with the same name.
 * - Multi-value filters append.
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

import { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"

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

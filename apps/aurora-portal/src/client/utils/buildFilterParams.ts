import { FilterSettings } from "@/client/components/ListToolbar/types"

/**
 * Builds filter parameters from current filter settings
 */
export const buildFilterParams = (filterSettings: FilterSettings): Record<string, string | boolean> => {
  const params: Record<string, string | boolean> = {}

  if (!filterSettings.selectedFilters?.length) return params

  filterSettings.selectedFilters
    .filter((sf) => !sf.inactive)
    .forEach((sf) => {
      if (sf.value === "true" || sf.value === "false") {
        params[sf.name] = sf.value === "true"
        return
      }
      params[sf.name] = sf.value
    })
  return params
}

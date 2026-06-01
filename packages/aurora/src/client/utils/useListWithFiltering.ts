import { startTransition, useState } from "react"
import { FilterSettings, SortOption, SortSettings } from "@/client/components/ListToolbar/types"

/**
 * Sort direction enumeration
 * Used across all sort-enabled list views
 */
export type SortDirection = "asc" | "desc"

/**
 * Generic required sort settings with guaranteed non-optional properties
 * Used by components to maintain a fully-defined sort state
 *
 * Type parameter K is the sort key type (string literal union of allowed sort fields)
 *
 * @example
 * // For floating IPs
 * type FloatingIpListSortSettings = ListSortConfig<FloatingIpsSortKey>
 *
 * // For security groups
 * type SecurityGroupListSortSettings = ListSortConfig<"name" | "project_id">
 */
export type ListSortConfig<T extends string = string> = {
  /**
   * Array of available sort options to display in the UI
   */
  options: SortOption[]
  /**
   * The currently selected sort field (guaranteed to be one of the available options)
   */
  sortBy: T
  /**
   * The currently active sort direction (guaranteed to be either "asc" or "desc")
   */
  sortDirection: SortDirection
}

/**
 * Configuration options for the useListWithFiltering hook
 */
export interface UseListWithFilteringOptions<T extends string> {
  /** Default sort key to use on initial render */
  defaultSortKey: T
  /** Default sort direction to use on initial render */
  defaultSortDir: SortDirection
  /** Available sort options to display in the sort dropdown */
  sortOptions: Array<{ label: string; value: string }>
  /** Initial filter settings configuration */
  filterSettings: FilterSettings
}

/**
 * Return value from the useListWithFiltering hook
 */
export interface UseListWithFilteringReturn<T extends string> {
  // State
  searchTerm: string
  sortSettings: ListSortConfig<T>
  filterSettings: FilterSettings

  // Handlers
  handleSearchChange: (term: string | number | string[] | undefined) => void
  handleSortChange: (newSortSettings: SortSettings) => void
  handleFilterChange: (newFilterSettings: FilterSettings) => void
}

/**
 * Custom hook to manage common list view state: search, sort, and filter
 *
 * Extracts shared logic from list components to ensure consistent behavior
 * across all list pages and reduce code duplication.
 *
 * @example
 * ```tsx
 * const listState = useListWithFiltering({
 *   defaultSortKey: "name",
 *   defaultSortDir: "asc",
 *   sortOptions: [
 *     { label: t`Name`, value: "name" },
 *     { label: t`Created`, value: "created_at" },
 *   ],
 *   filterSettings: {
 *     filters: [
 *       { displayName: t`Status`, filterName: "status", values: ["active", "inactive"] }
 *     ]
 *   }
 * })
 * ```
 */
export function useListWithFiltering<T extends string>({
  defaultSortKey,
  defaultSortDir,
  sortOptions,
  filterSettings: initialFilterSettings,
}: UseListWithFilteringOptions<T>): UseListWithFilteringReturn<T> {
  // Search
  const [searchTerm, setSearchTerm] = useState("")
  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => setSearchTerm(searchValue))
  }

  // Sort
  const [sortSettings, setSortSettings] = useState<ListSortConfig<T>>({
    options: sortOptions,
    sortBy: defaultSortKey,
    sortDirection: defaultSortDir,
  })
  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: ListSortConfig<T> = {
      options: newSortSettings.options ?? sortSettings.options,
      sortBy: (newSortSettings.sortBy?.toString() as T) || defaultSortKey,
      sortDirection: (newSortSettings.sortDirection as SortDirection) || defaultSortDir,
    }
    setSortSettings(settings)
  }

  // Filter
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(initialFilterSettings)
  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    startTransition(() => setFilterSettings(newFilterSettings))
  }

  return {
    searchTerm,
    sortSettings,
    filterSettings,
    handleSearchChange,
    handleSortChange,
    handleFilterChange,
  }
}

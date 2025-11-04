/**
 * Represents a single selected filter value in the active filter list
 * Used to track which filters are currently applied to the data
 */
export type SelectedFilter = {
  /** The filter name/key this selection belongs to (e.g., "status", "visibility") */
  name: string
  /** The selected value for this filter (e.g., "active", "public") */
  value: string
  /**
   * Whether this filter is temporarily disabled without removing it
   * Useful for "show/hide" functionality in the UI
   * @default false
   */
  inactive?: boolean
}

/**
 * Defines a filterable field and its available options
 * Represents a single filter category that users can apply to narrow down results
 */
export type Filter = {
  /**
   * Human-readable name shown in the UI
   * @example "Status", "Visibility", "Disk Format"
   */
  displayName: string
  /**
   * The actual parameter name used in API requests
   * @example "status", "visibility", "disk_format"
   */
  filterName: string
  /**
   * Array of available values users can select for this filter
   * @example ["active", "queued", "saving"] for status filter
   */
  values: string[]
  /**
   * Whether this filter supports selecting multiple values using the 'in' operator
   *
   * For OpenStack Glance API:
   * - Supports 'in': name, status, id, container_format, disk_format
   * - Does NOT support 'in': visibility, protected, owner, tags, dates
   *
   * When true, multiple selections will be combined as: `filterName=in:value1,value2,value3`
   * When false, only single value is allowed: `filterName=value`
   *
   * @default false
   * @example
   * // supportsMultiValue: true
   * status=in:active,queued,saving
   *
   * // supportsMultiValue: false
   * visibility=public
   */
  supportsMultiValue?: boolean
}

/**
 * Complete filter configuration including available filters and current selections
 * Represents the entire filtering state for a list view
 */
export type FilterSettings = {
  /**
   * Currently applied filters by the user
   * If undefined or empty, no filters are active
   */
  selectedFilters?: SelectedFilter[]
  /**
   * Available filter definitions that users can choose from
   * These define what filters are available in the UI
   */
  filters: Filter[]
}

/**
 * Represents a single option in the sort dropdown
 * Defines a field that data can be sorted by
 */
export type SortOption = {
  /**
   * The actual field name to sort by (used in API requests)
   * @example "created_at", "name", "size", "status"
   */
  value: string
  /**
   * Human-readable label shown in the UI
   * @example "Created At", "Name", "Size", "Status"
   */
  label: string
}

/**
 * Complete sorting configuration including available options and current sort state
 * Represents the entire sorting state for a list view
 */
export type SortSettings = {
  /**
   * Array of available fields that can be used for sorting
   * These options are displayed in the sort dropdown
   */
  options: SortOption[]
  /**
   * Currently selected sort field
   * Can be a string (single field), number (field index), or array (multiple fields)
   *
   * For OpenStack Glance API, typically a string representing the field name
   * @example "created_at", "name", "size"
   */
  sortBy?: string | number | string[]
  /**
   * Current sort direction
   *
   * - "asc": Ascending order (A-Z, 0-9, oldest to newest)
   * - "desc": Descending order (Z-A, 9-0, newest to oldest)
   *
   * @default "desc" (typically for created_at to show newest first)
   */
  sortDirection?: "asc" | "desc"
}

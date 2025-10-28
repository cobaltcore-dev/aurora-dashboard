export type SelectedFilter = {
  name: string
  value: string
  inactive?: boolean
}

export type Filter = {
  displayName: string
  filterName: string
  values: string[]
}

export type FilterSettings = {
  selectedFilters?: SelectedFilter[]
  filters: Filter[]
}

export type SortOption = {
  value: string
  label: string
}

export type SortSettings = {
  options: SortOption[]
  sortBy?: string | number | string[]
  sortDirection?: "asc" | "desc"
}

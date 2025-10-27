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

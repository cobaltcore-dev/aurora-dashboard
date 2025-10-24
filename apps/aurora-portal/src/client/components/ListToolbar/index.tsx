import { useCallback } from "react"
import { InputGroup, SearchInput, SearchInputProps, Stack, StackProps } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { SelectedFilters } from "./SelectedFilters"
import { FiltersInput, FiltersInputProps } from "./FiltersInput"
import { Filter, FilterSettings, SelectedFilter } from "./types"

export type ListToolbarProps = {
  /**
   * Array of available filter definitions. Each filter contains a name, display name,
   * and possible values that can be selected.
   */
  filters: Filter[]
  /**
   * Current filter settings containing selected filters and search term.
   * This represents the complete filter state of the list.
   */
  filterSettings: FilterSettings
  /**
   * Callback function invoked when filter settings change (filter added/removed or search term updated).
   * Receives the updated filter settings object.
   */
  onFilterChange: (filterSettings: FilterSettings) => void
  /**
   * Optional props to customize the Stack wrapper component that contains the entire toolbar.
   * Allows customization of layout, spacing, and styling.
   */
  listToolbarWrapperProps?: StackProps
  /**
   * Optional props to customize the FiltersInput component.
   * Excludes 'filters', 'onChange', and 'onClear' props as these are managed internally.
   */
  filtersInputProps?: Omit<FiltersInputProps, "filters" | "onChange" | "onClear">
  /**
   * Optional props to customize the SearchInput component.
   * Excludes 'value', 'onSearch', and 'onClear' props as these are managed internally.
   */
  searchInputProps?: Omit<SearchInputProps, "value" | "onSearch" | "onClear">
}

/**
 * ListToolbar Component
 *
 * A comprehensive toolbar component for filtering and searching list data. It provides:
 * - Filter selection interface (filter type + value)
 * - Search input field
 * - Visual display of currently active filters as removable pills
 * - Clear all functionality
 *
 * The component manages the interaction between filter inputs and displays the current
 * filter state, allowing users to add, remove, and clear filters, as well as perform
 * text-based searches.
 *
 * **Features:**
 * - Prevents duplicate filters from being added
 * - Displays active filters as closeable pills
 * - Integrates search functionality alongside filters
 * - Fully customizable sub-components via prop spreading
 */
export const ListToolbar = ({
  filters,
  filterSettings,
  onFilterChange,
  listToolbarWrapperProps = {},
  filtersInputProps = {},
  searchInputProps = {},
}: ListToolbarProps) => {
  const { t } = useLingui()

  const handleFilterDelete = useCallback(
    (filterToRemove: SelectedFilter) => {
      onFilterChange({
        ...filterSettings,
        selectedFilters: filterSettings.selectedFilters?.filter(
          (filter) => !(filter.name === filterToRemove.name && filter.value === filterToRemove.value)
        ),
      })
    },
    [filterSettings, onFilterChange]
  )

  const handleSelect = (selectedFilter: SelectedFilter) => {
    const filterExists = filterSettings.selectedFilters?.some(
      (filter) => filter.name === selectedFilter.name && filter.value === selectedFilter.value
    )
    // Only add the filter if it does not already exist
    if (!filterExists) {
      onFilterChange({
        ...filterSettings,
        selectedFilters: [...(filterSettings.selectedFilters || []), selectedFilter],
      })
    }
  }

  /**
   * Returns default props for the main toolbar Stack wrapper.
   * Sets up vertical layout with consistent spacing and background styling.
   */
  const getDefaultListToolbarWrapperProps = (): StackProps => ({
    direction: "vertical",
    gap: "4",
    className: "bg-theme-background-lvl-1 py-2 px-4",
  })

  /**
   * Returns default props for the FiltersInput component.
   * Connects the filters data and handles filter selection and clearing.
   */
  const getDefaultFiltersInputProps = (): FiltersInputProps => ({
    filters,
    onChange: handleSelect,
    onClear: () =>
      onFilterChange({
        ...filterSettings,
        selectedFilters: [],
      }),
  })

  /**
   * Returns default props for the SearchInput component.
   * Manages search term state and provides search/clear functionality.
   */
  const getDefaultSearchInputProps = (): SearchInputProps & { "data-testid"?: string } => ({
    placeholder: t`Search...`,
    className: "w-64 ml-auto",
    "data-testid": "searchbar",
    value: filterSettings.searchTerm,
    onSearch: (searchTerm) => {
      onFilterChange({
        ...filterSettings,
        searchTerm,
      })
    },
    onClear: () =>
      onFilterChange({
        ...filterSettings,
        searchTerm: "",
      }),
  })

  return (
    <Stack {...getDefaultListToolbarWrapperProps()} {...listToolbarWrapperProps}>
      <InputGroup>
        <FiltersInput {...getDefaultFiltersInputProps()} {...filtersInputProps} />
        <SearchInput {...getDefaultSearchInputProps()} {...searchInputProps} />
      </InputGroup>
      {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
        <SelectedFilters selectedFilters={filterSettings.selectedFilters} onDelete={handleFilterDelete} />
      )}
    </Stack>
  )
}

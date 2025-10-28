import { useCallback } from "react"
import {
  ButtonProps,
  InputGroup,
  SearchInput,
  SearchInputProps,
  Stack,
  StackProps,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { SelectedFilters } from "./SelectedFilters"
import { FiltersInput, FiltersInputProps } from "./FiltersInput"
import { FilterSettings, SelectedFilter } from "./types"

export type ListToolbarProps = {
  /**
   * Current filter state containing both selected filters and available filter definitions.
   * Includes the array of currently active filters and the list of all possible filter options.
   */
  filterSettings: FilterSettings
  /**
   * Callback function invoked when filters change (filter added, removed, or cleared).
   * Receives the updated FilterSettings object with the new filter state.
   */
  onFilter: (filterSettings: FilterSettings) => void
  /**
   * Current search term value displayed in the search input field.
   * Controls the text input state for searching/filtering list items.
   */
  searchTerm: string
  /**
   * Callback function invoked when the search term changes.
   * Receives the updated search term string as the user types or clears the search.
   */
  onSearch: (searchTerm: string) => void
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

  /** Optional props to customize the "Clear all" Button component. */
  clearButtonProps?: ButtonProps
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
  filterSettings,
  onFilter,
  searchTerm,
  onSearch,
  listToolbarWrapperProps = {},
  filtersInputProps = {},
  searchInputProps = {},
  clearButtonProps = {},
}: ListToolbarProps) => {
  const { t } = useLingui()

  const handleFilterDelete = useCallback(
    (filterToRemove: SelectedFilter) => {
      onFilter({
        ...filterSettings,
        selectedFilters: filterSettings.selectedFilters?.filter(
          (filter) => !(filter.name === filterToRemove.name && filter.value === filterToRemove.value)
        ),
      })
    },
    [filterSettings, onFilter]
  )

  const handleSelect = (selectedFilter: SelectedFilter) => {
    const filterExists = filterSettings.selectedFilters?.some(
      (filter) => filter.name === selectedFilter.name && filter.value === selectedFilter.value
    )
    // Only add the filter if it does not already exist
    if (!filterExists) {
      onFilter({
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
    filters: filterSettings.filters,
    onChange: handleSelect,
  })

  /**
   * Returns default props for the SearchInput component.
   * Manages search term state and provides search/clear functionality.
   */
  const getDefaultSearchInputProps = (): SearchInputProps & { "data-testid"?: string } => ({
    placeholder: t`Search...`,
    className: "w-64 ml-auto",
    "data-testid": "searchbar",
    value: searchTerm,
    onSearch,
    onClear: () => onSearch(""),
  })

  return (
    <Stack {...getDefaultListToolbarWrapperProps()} {...listToolbarWrapperProps}>
      <InputGroup>
        <FiltersInput {...getDefaultFiltersInputProps()} {...filtersInputProps} />
        <SearchInput {...getDefaultSearchInputProps()} {...searchInputProps} />
      </InputGroup>
      {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
        <SelectedFilters
          selectedFilters={filterSettings.selectedFilters}
          clearButtonProps={clearButtonProps}
          onDelete={handleFilterDelete}
          onClear={() =>
            onFilter({
              ...filterSettings,
              selectedFilters: [],
            })
          }
        />
      )}
    </Stack>
  )
}

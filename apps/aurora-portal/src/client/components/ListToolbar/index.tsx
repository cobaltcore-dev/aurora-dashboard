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
import { SortInput, SortInputProps } from "./SortInput"
import { FilterSettings, SelectedFilter, SortSettings } from "./types"
import { cn } from "@/client/utils/cn"

export type ListToolbarProps = {
  /**
   * Current filter state containing both the array of active filters and available filter definitions.
   */
  filterSettings: FilterSettings
  /**
   * Callback function invoked when filters change (added, removed, or cleared).
   */
  onFilter: (filterSettings: FilterSettings) => void
  /**
   * Current sort configuration including the sort field and direction (ascending/descending).
   */
  sortSettings?: SortSettings
  /**
   * Callback function invoked when the sort configuration changes.
   */
  onSort?: (sortSettings: SortSettings) => void
  /**
   * Current search term value for filtering list items.
   */
  searchTerm: string
  /**
   * Callback function invoked when the search term changes.
   */
  onSearch: (searchTerm: string) => void
  /**
   * Optional props to customize the Stack wrapper component that contains the entire toolbar.
   * Allows customization of layout, spacing, and styling.
   */
  listToolbarWrapperProps?: StackProps
  /**
   * Optional props to customize the FiltersInput component.
   * Excludes 'filters' and 'onChange' props as these are managed internally.
   */
  filtersInputProps?: Omit<FiltersInputProps, "filters" | "onChange">
  /**
   * Optional props to customize the SortInput component.
   * Excludes 'options', 'sortBy', 'sortDirection', 'onSortByChange' and 'onSortDirectionChange' props as these are managed internally.
   */
  sortInputProps?: Omit<
    SortInputProps,
    "options" | "sortBy" | "sortDirection" | "onSortByChange" | "onSortDirectionChange"
  >
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
 * A comprehensive toolbar component for filtering, sorting, and searching list data. It provides:
 * - Filter selection interface (filter type + value)
 * - Sort selection interface (sort field + direction)
 * - Search input field
 * - Visual display of currently active filters as removable pills
 * - Clear all functionality
 *
 * The component manages the interaction between filter inputs, sort controls, and displays the current
 * filter state, allowing users to add, remove, and clear filters, change sort order, as well as perform
 * text-based searches.
 *
 * **Features:**
 * - Prevents duplicate filters from being added
 * - Displays active filters as closeable pills
 * - Provides sort field and direction controls
 * - Integrates search functionality alongside filters and sorting
 * - Fully customizable sub-components via prop spreading
 */
export const ListToolbar = ({
  filterSettings,
  onFilter,
  sortSettings,
  onSort,
  searchTerm,
  onSearch,
  listToolbarWrapperProps = {},
  filtersInputProps = {},
  sortInputProps = {},
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
   * Merges default props with user-provided props for the main toolbar Stack wrapper.
   * Applies vertical layout, consistent spacing, and background styling while preserving custom overrides.
   */
  const getDefaultListToolbarWrapperProps = (): StackProps => {
    const { className, ...restProps } = listToolbarWrapperProps

    return {
      direction: "vertical",
      gap: "4",
      className: cn("bg-theme-background-lvl-1 py-2 px-4", className),
      ...restProps,
    }
  }

  /**
   * Merges default props with user-provided props for the FiltersInput component.
   * Connects filter settings and change handlers while preserving custom overrides.
   */
  const getDefaultFiltersInputProps = (): FiltersInputProps => {
    return {
      filters: filterSettings.filters,
      onChange: handleSelect,
      ...filtersInputProps,
    }
  }

  /**
   * Merges default props with user-provided props for the SortInput component.
   * Connects sort settings and change handlers while preserving custom overrides.
   */
  const getDefaultSortInputProps = (): SortInputProps => {
    return onSort && sortSettings
      ? {
          options: sortSettings.options,
          sortBy: sortSettings.sortBy,
          sortDirection: sortSettings.sortDirection || "asc",
          onSortByChange: (param) =>
            onSort({ ...sortSettings, sortBy: param, sortDirection: sortSettings.sortDirection || "asc" }),
          onSortDirectionChange: (direction: "asc" | "desc") => onSort({ ...sortSettings, sortDirection: direction }),
          ...sortInputProps,
        }
      : ({} as SortInputProps)
  }

  /**
   * Merges default props with user-provided props for the SearchInput component.
   * Applies default placeholder, styling, and search handlers while preserving custom overrides.
   */
  const getDefaultSearchInputProps = (): SearchInputProps & { "data-testid"?: string } => {
    const { className, ...restProps } = searchInputProps

    return {
      placeholder: t`Search...`,
      className: cn("w-64 ml-auto", className),
      "data-testid": "searchbar",
      value: searchTerm,
      onSearch,
      onClear: () => onSearch(""),
      ...restProps,
    }
  }

  return (
    <Stack {...getDefaultListToolbarWrapperProps()}>
      <InputGroup>
        <FiltersInput {...getDefaultFiltersInputProps()} />
        {onSort && sortSettings && <SortInput {...getDefaultSortInputProps()} />}
        <SearchInput {...getDefaultSearchInputProps()} />
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

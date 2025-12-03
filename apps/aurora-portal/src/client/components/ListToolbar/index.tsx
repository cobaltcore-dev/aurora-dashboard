import { ReactNode, useCallback, useRef, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { cn } from "@/client/utils/cn"
import { SearchInput, SearchInputProps, Stack } from "@cloudoperators/juno-ui-components"
import { SelectedFilters } from "./SelectedFilters"
import { FiltersInput, FiltersInputProps } from "./FiltersInput"
import { SortInput, SortInputProps } from "./SortInput"
import { FilterSettings, SelectedFilter, SortSettings } from "./types"

export type ListToolbarProps = {
  filterSettings?: FilterSettings
  onFilter?: (filterSettings: FilterSettings) => void
  sortSettings?: SortSettings
  onSort?: (sortSettings: SortSettings) => void
  searchTerm?: string
  onSearch?: (searchTerm: string) => void
  filtersInputProps?: Omit<FiltersInputProps, "filters" | "onChange">
  sortInputProps?: Omit<
    SortInputProps,
    "options" | "sortBy" | "sortDirection" | "onSortByChange" | "onSortDirectionChange"
  >
  searchInputProps?: Omit<SearchInputProps, "value" | "onSearch" | "onClear">
  actions?: ReactNode
}

export const ListToolbar = ({
  filterSettings,
  onFilter,
  sortSettings,
  onSort,
  searchTerm,
  onSearch,
  filtersInputProps = {},
  sortInputProps = {},
  searchInputProps = {},
  actions,
}: ListToolbarProps) => {
  const { t } = useLingui()

  const debounceTimerRef = useRef<number | undefined>(undefined)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleFilterDelete = useCallback(
    (filterToRemove: SelectedFilter) => {
      if (!onFilter || !filterSettings) return

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
    if (!onFilter || !filterSettings) return

    const filterExists = filterSettings.selectedFilters?.some(
      (filter) => filter.name === selectedFilter.name && filter.value === selectedFilter.value
    )

    if (!filterExists) {
      const supportsMultiValue = filterSettings.filters.find(
        (filter) => selectedFilter.name === filter.filterName
      )?.supportsMultiValue

      return supportsMultiValue
        ? onFilter({
            ...filterSettings,
            selectedFilters: [...(filterSettings.selectedFilters || []), selectedFilter],
          })
        : onFilter({
            ...filterSettings,
            selectedFilters: [
              ...(filterSettings.selectedFilters || []).filter((filter) => filter.name !== selectedFilter.name),
              selectedFilter,
            ],
          })
    }
  }

  const handleSearch = useCallback(
    (value: string | number | string[] | undefined) => {
      const searchValue = typeof value === "string" ? value : ""

      // Clear any pending debounced search
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      onSearch?.(searchValue)
    },
    [onSearch]
  )

  const handleSearchInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const searchValue = event.currentTarget.value

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = window.setTimeout(() => {
        onSearch?.(searchValue)
      }, 500)
    },
    [onSearch]
  )

  const handleSearchClear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    onSearch?.("")
  }, [onSearch])

  const getDefaultFiltersInputProps = (): FiltersInputProps | null => {
    if (!filterSettings || !onFilter) return null

    const { selectInputProps, ...restProps } = filtersInputProps

    return {
      filters: filterSettings.filters,
      onChange: handleSelect,
      selectInputProps: {
        className: cn("min-w-48 max-w-64 flex-shrink", selectInputProps?.className),
        ...selectInputProps,
      },
      ...restProps,
    }
  }

  const getDefaultSortInputProps = (): SortInputProps | null => {
    if (!onSort || !sortSettings) return null

    const { inputGroupProps, ...restProps } = sortInputProps

    return {
      options: sortSettings.options,
      sortBy: sortSettings.sortBy,
      sortDirection: sortSettings.sortDirection || "asc",
      onSortByChange: (param) =>
        onSort({ ...sortSettings, sortBy: param, sortDirection: sortSettings.sortDirection || "asc" }),
      onSortDirectionChange: (direction: "asc" | "desc") => onSort({ ...sortSettings, sortDirection: direction }),
      inputGroupProps: {
        className: cn("min-w-48 max-w-60 flex-shrink", inputGroupProps?.className),
        ...inputGroupProps,
      },
      ...restProps,
    }
  }

  const getDefaultSearchInputProps = (): (SearchInputProps & { "data-testid"?: string }) | null => {
    if (!onSearch) return null

    const { className, ...restProps } = searchInputProps

    return {
      placeholder: t`Search...`,
      className: cn("w-full md:w-64 md:flex-grow md:max-w-xl ml-auto", className),
      "data-testid": "searchbar",
      value: searchTerm,
      onSearch: handleSearch,
      onInput: handleSearchInput,
      onClear: handleSearchClear,
      ...restProps,
    }
  }

  const filtersProps = getDefaultFiltersInputProps()
  const sortProps = getDefaultSortInputProps()
  const searchProps = getDefaultSearchInputProps()

  return (
    <Stack alignment="center" gap="6" className="bg-theme-background-lvl-1 p-4 flex flex-col w-full">
      {actions && (
        <Stack direction="horizontal" className="w-full justify-end">
          {actions}
        </Stack>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
        <div className="flex flex-row items-center gap-6 flex-1 w-full sm:w-auto">
          {filtersProps && <FiltersInput {...filtersProps} />}
          {sortProps && <SortInput {...sortProps} />}
        </div>

        {searchProps && (
          <div className="w-full sm:w-auto sm:min-w-48 sm:max-w-96 sm:ml-auto">
            <SearchInput {...searchProps} />
          </div>
        )}
      </div>

      {filterSettings?.selectedFilters && filterSettings.selectedFilters.length > 0 && onFilter && (
        <div className="w-full">
          <SelectedFilters
            selectedFilters={filterSettings.selectedFilters}
            onDelete={handleFilterDelete}
            onClear={() =>
              onFilter({
                ...filterSettings,
                selectedFilters: [],
              })
            }
          />
        </div>
      )}
    </Stack>
  )
}

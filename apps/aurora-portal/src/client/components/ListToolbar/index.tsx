import { ReactNode, useCallback, useRef, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { SearchInput, SearchInputProps, Stack } from "@cloudoperators/juno-ui-components"
import { SelectedFilters } from "./SelectedFilters"
import { FiltersInput } from "./FiltersInput"
import { SortInput } from "./SortInput"
import { FilterSettings, SelectedFilter, SortSettings } from "./types"

export type ListToolbarProps = {
  filterSettings?: FilterSettings
  onFilter?: (filterSettings: FilterSettings) => void
  sortSettings?: SortSettings
  onSort?: (sortSettings: SortSettings) => void
  searchTerm?: string
  onSearch?: (searchTerm: string) => void
  searchInputProps?: Omit<SearchInputProps, "value" | "onSearch" | "onClear" | "onInput">
  actions?: ReactNode
}

export const ListToolbar = ({
  filterSettings,
  onFilter,
  sortSettings,
  onSort,
  searchTerm,
  onSearch,
  searchInputProps = {},
  actions,
}: ListToolbarProps) => {
  const { t } = useLingui()

  const debounceTimerRef = useRef<number | undefined>(undefined)

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
    if (filterExists) return

    const supportsMultiValue = filterSettings.filters.find(
      (filter) => selectedFilter.name === filter.filterName
    )?.supportsMultiValue

    const newSelected = supportsMultiValue
      ? [...(filterSettings.selectedFilters || []), selectedFilter]
      : [
          ...(filterSettings.selectedFilters || []).filter((filter) => filter.name !== selectedFilter.name),
          selectedFilter,
        ]

    onFilter({ ...filterSettings, selectedFilters: newSelected })
  }

  const handleSearch = useCallback(
    (value: string | number | string[] | undefined) => {
      const searchValue = typeof value === "string" ? value : ""

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
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = window.setTimeout(() => onSearch?.(searchValue), 500)
    },
    [onSearch]
  )

  const handleSearchClear = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    onSearch?.("")
  }, [onSearch])

  const filtersProps = filterSettings && onFilter ? { filters: filterSettings.filters, onChange: handleSelect } : null
  const sortProps =
    sortSettings && onSort
      ? {
          options: sortSettings.options,
          sortBy: sortSettings.sortBy,
          sortDirection: sortSettings.sortDirection || "asc",
          onSortByChange: (param: string | number | string[] | undefined) =>
            onSort({ ...sortSettings, sortBy: param, sortDirection: sortSettings.sortDirection || "asc" }),
          onSortDirectionChange: (direction: "asc" | "desc") => onSort({ ...sortSettings, sortDirection: direction }),
        }
      : null

  const searchProps: (SearchInputProps & { "data-testid"?: string }) | null = onSearch
    ? {
        placeholder: t`Search...`,
        "data-testid": "searchbar",
        value: searchTerm,
        onInput: handleSearchInput,
        onClear: handleSearchClear,
        onSearch: handleSearch,
        ...searchInputProps,
      }
    : null

  return (
    <Stack alignment="center" gap="6" className="bg-theme-background-lvl-1 p-4 flex flex-col w-full">
      {actions && (
        <Stack direction="horizontal" className="w-full justify-end">
          {actions}
        </Stack>
      )}

      <div className="flex w-full flex-col flex-wrap items-center gap-4 md:flex-row">
        {filtersProps && <FiltersInput {...filtersProps} />}
        {sortProps && <SortInput {...sortProps} />}

        {searchProps && (
          <div className="w-full md:w-auto md:ml-auto">
            <SearchInput {...searchProps} />
          </div>
        )}
      </div>

      {filterSettings?.selectedFilters && filterSettings.selectedFilters.length > 0 && onFilter && (
        <div className="w-full">
          <SelectedFilters
            selectedFilters={filterSettings.selectedFilters}
            onDelete={handleFilterDelete}
            onClear={() => onFilter({ ...filterSettings, selectedFilters: [] })}
          />
        </div>
      )}
    </Stack>
  )
}

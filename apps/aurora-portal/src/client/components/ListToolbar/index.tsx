import { ReactNode, useCallback, useRef, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  SearchInput,
  SearchInputProps,
  Stack,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
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
  tabs?: {
    items: Array<{ label: string; value: string }>
    activeItem: string
    onActiveItemChange: (value: ReactNode) => void
  }
  // Count information
  totalCount?: number
  itemName?: string // e.g. "items", "users", "projects" - used in count display
  filteredCount?: number
  // Last updated timestamp
  lastUpdated?: Date | string
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
  tabs,
  totalCount,
  filteredCount,
  itemName = "items",
  lastUpdated,
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

  // Format last updated time
  const formatLastUpdated = (date: Date | string | undefined): string => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleString()
  }

  const showCountInfo = totalCount !== undefined && filteredCount !== undefined

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
    <>
      {tabs && (
        <div className="w-full">
          <TabNavigation activeItem={tabs.activeItem} onActiveItemChange={tabs.onActiveItemChange}>
            {tabs.items.map((item) => (
              <TabNavigationItem key={item.value} label={item.label} value={item.value} />
            ))}
          </TabNavigation>
        </div>
      )}
      <Stack alignment="center" gap="6" className="bg-theme-background-lvl-1 flex w-full flex-col p-4">
        {actions && (
          <Stack direction="horizontal" className="w-full justify-end">
            {actions}
          </Stack>
        )}

        <div className="flex w-full flex-col items-stretch gap-4 md:flex-row md:items-center">
          {filtersProps && (
            <div className="w-full md:w-auto md:min-w-37.5">
              <FiltersInput {...filtersProps} />
            </div>
          )}
          {sortProps && (
            <div className="w-full md:w-auto md:min-w-45">
              <SortInput {...sortProps} />
            </div>
          )}
          {searchProps && (
            <div className="w-full md:ml-auto md:w-auto md:min-w-25">
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
        {/* Count and Last Updated Info */}
        {(showCountInfo || lastUpdated) && (
          <div className="text-theme-secondary flex w-full items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {showCountInfo && (
                <span>
                  <Trans>
                    Showing {filteredCount} of {totalCount} {itemName}
                  </Trans>
                </span>
              )}
              {lastUpdated &&
                (() => {
                  const formattedDate = formatLastUpdated(lastUpdated)
                  return (
                    <span>
                      <Trans>Last updated: {formattedDate}</Trans>
                    </span>
                  )
                })()}
            </div>
          </div>
        )}
      </Stack>
    </>
  )
}

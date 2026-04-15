import { ReactNode, useCallback } from "react"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  InputGroup,
  SearchInput,
  Select,
  SelectOption,
  SortButton,
  Stack,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import { SelectedFilters } from "./SelectedFilters"
import { FiltersInput } from "./FiltersInput"
import { FilterSettings, SelectedFilter, SortSettings } from "./types"

export type ListToolbarProps = {
  filterSettings?: FilterSettings
  onFilter?: (filterSettings: FilterSettings) => void
  sortSettings?: SortSettings
  onSort?: (sortSettings: SortSettings) => void
  searchTerm?: string
  onSearch?: (searchTerm: string) => void
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
  actions,
  tabs,
  totalCount,
  filteredCount,
  itemName = "items",
  lastUpdated,
}: ListToolbarProps) => {
  const { t } = useLingui()

  const form = useForm({
    defaultValues: {
      search: searchTerm ?? "",
    },
  })

  // Format last updated time
  const formatLastUpdated = (date: Date | string | undefined): string => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleString()
  }

  const showCountInfo = totalCount !== undefined && filteredCount !== undefined
  const formattedLastUpdated = formatLastUpdated(lastUpdated)

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

  const filtersProps = filterSettings && onFilter ? { filters: filterSettings.filters, onChange: handleSelect } : null
  const sortDirection = sortSettings?.sortDirection ?? "asc"

  const handleSortByChange = useCallback(
    (param: string | number | string[] | undefined) => {
      if (!sortSettings || !onSort) return
      onSort({ ...sortSettings, sortBy: param, sortDirection })
    },
    [onSort, sortDirection, sortSettings]
  )

  const handleSortDirectionChange = useCallback(
    (direction: "asc" | "desc") => {
      if (!sortSettings || !onSort) return
      onSort({ ...sortSettings, sortDirection: direction })
    },
    [onSort, sortSettings]
  )

  const handleSearchClear = useCallback(() => {
    form.setFieldValue("search", "")
    onSearch?.("")
  }, [onSearch])

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
          {sortSettings && onSort && (
            <div className="w-full md:w-auto md:min-w-45">
              <InputGroup className="flex w-full items-end sm:w-auto">
                <Select
                  value={sortSettings.sortBy}
                  onChange={handleSortByChange}
                  label={t`Sort by`}
                  className="grow"
                  data-testid="sort-select"
                >
                  {sortSettings.options.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </Select>
                <SortButton
                  order={sortDirection}
                  onChange={handleSortDirectionChange}
                  className="shadow-none"
                  data-testid="direction-toggle"
                />
              </InputGroup>
            </div>
          )}
          {onSearch && (
            <div className="w-full md:ml-auto md:w-auto md:min-w-25">
              <form.Field
                name="search"
                listeners={{
                  onChangeDebounceMs: 500,
                  onChange: ({ value }) => {
                    onSearch?.(value)
                  },
                }}
                children={(field) => (
                  <SearchInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onInput={(e) => field.handleChange(e.currentTarget.value)}
                    onClear={handleSearchClear}
                    placeholder={t`Search...`}
                    data-testid="searchbar"
                  />
                )}
              />
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
      {/* Count and Last Updated Info */}
      {(showCountInfo || lastUpdated) && (
        <div className="text-theme-secondary flex w-full items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {showCountInfo && (
              <span>
                <Trans>
                  Showing {filteredCount} of {totalCount} {itemName}
                </Trans>
              </span>
            )}
            {lastUpdated && (
              <span>
                <Trans>Last updated: {formattedLastUpdated}</Trans>
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

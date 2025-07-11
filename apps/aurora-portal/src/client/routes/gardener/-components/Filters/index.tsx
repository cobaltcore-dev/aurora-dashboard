import React, { useCallback } from "react"
import { Button, InputGroup, SearchInput, Stack } from "@cloudoperators/juno-ui-components"
import { FilterSelect } from "./FilterSelect"
import { Filter, FilterSettings, SelectedFilter } from "./types"
import { SelectedFilters } from "./SelectedFilters"
import { useLingui } from "@lingui/react/macro"

export type FiltersProps = {
  filters: Filter[]
  filterSettings: FilterSettings
  onFilterChange: (filterSettings: FilterSettings) => void
}

export const Filters = ({ filters, filterSettings, onFilterChange }: FiltersProps) => {
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

  return (
    <Stack direction="vertical" gap="4" className="bg-theme-background-lvl-1 py-2 px-4 ">
      <InputGroup>
        <FilterSelect
          filters={filters}
          onChange={(selectedFilter) => {
            const filterExists = filterSettings.selectedFilters?.some(
              (filter) => filter.name === selectedFilter.name && filter.value === selectedFilter.value
            )
            //only add the filter if it does not already exist
            if (!filterExists) {
              onFilterChange({
                ...filterSettings,
                selectedFilters: [...(filterSettings.selectedFilters || []), selectedFilter],
              })
            }
          }}
        />
        <Button
          label={t`Clear all`}
          className="ml-4"
          onClick={() =>
            onFilterChange({
              ...filterSettings,
              selectedFilters: [],
            })
          }
          variant="subdued"
        />
        <SearchInput
          placeholder={t`Search clusters...`}
          className="w-64 ml-auto"
          data-testid="searchbar"
          value={filterSettings.searchTerm}
          onSearch={(searchTerm) => {
            onFilterChange({
              ...filterSettings,
              searchTerm,
            })
          }}
          onClear={() =>
            onFilterChange({
              ...filterSettings,
              searchTerm: "",
            })
          }
        />
      </InputGroup>
      {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
        <SelectedFilters selectedFilters={filterSettings.selectedFilters} onDelete={handleFilterDelete} />
      )}
    </Stack>
  )
}

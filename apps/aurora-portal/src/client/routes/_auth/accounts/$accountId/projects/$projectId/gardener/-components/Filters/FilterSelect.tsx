import React, { useCallback, useState } from "react"
import { InputGroup, ComboBox, ComboBoxOption, SelectOption, Select, Stack } from "@cloudoperators/juno-ui-components"
import { Filter, SelectedFilter } from "./types"
import { useLingui } from "@lingui/react/macro"

type FilterSelectProps = {
  filters: Filter[]
  onChange: (filter: SelectedFilter) => void
}

function isEmpty(value: unknown) {
  if (value == null) return true // null or undefined
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

export const FilterSelect = ({ filters, onChange }: FilterSelectProps) => {
  const { t } = useLingui()

  const [selectedFilterName, setSelectedFilterName] = useState<string>("")
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("")

  // first filter gets the values, second one filters emtpy values
  const filterValues: string[] | undefined = filters
    .find((filter) => filter.filterName === selectedFilterName)
    ?.values?.filter((value) => value)

  const handleValueChange = useCallback(
    (value: string) => {
      setSelectedFilterValue(value) // update the filter value state to trigger re-render on ComboBox
      if (!isEmpty(selectedFilterName) && !isEmpty(value)) {
        onChange({
          name: selectedFilterName,
          value: value,
        })
      }
      // TODO: remove this after ComboBox supports resetting its value after onChange
      // set timeout to allow ComboBox to update its value after onChange
      setTimeout(() => {
        setSelectedFilterValue("")
      }, 0)
    },
    [selectedFilterName, setSelectedFilterValue, onChange]
  )

  return (
    <Stack alignment="center" gap="8">
      <InputGroup>
        <Select
          className="filter-label-select w-64 mb-0"
          name="filter"
          data-testid="select-filterValue"
          label={t`Filters`}
          value={selectedFilterName}
          onChange={(value) => {
            setSelectedFilterName(String(value))
          }}
        >
          {filters?.map(({ displayName, filterName }) => (
            <SelectOption value={filterName} label={displayName} key={filterName} data-testid={filterName} />
          ))}
        </Select>
        <ComboBox
          className="filter-value-select w-48 bg-theme-background-lvl-0"
          name="filterValue"
          data-testid="combobox-filterValue"
          value={selectedFilterValue}
          disabled={!selectedFilterName}
          onChange={handleValueChange}
        >
          {filterValues?.map((value) => <ComboBoxOption value={value} key={value} label={value} data-testid={value} />)}
        </ComboBox>
      </InputGroup>
    </Stack>
  )
}

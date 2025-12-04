import { useCallback, useState } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  InputGroup,
  ComboBox,
  ComboBoxProps,
  ComboBoxOption,
  SelectOption,
  Select,
  SelectProps,
} from "@cloudoperators/juno-ui-components"
import { Filter, SelectedFilter } from "./types"

export type FiltersInputProps = {
  filters: Filter[]
  onChange: (filter: SelectedFilter) => void
}

function isEmpty(value: unknown) {
  if (value == null) return true
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

export const FiltersInput = ({ filters, onChange }: FiltersInputProps) => {
  const { t } = useLingui()

  const [selectedFilterName, setSelectedFilterName] = useState<string>("")
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("")

  const filterValues: string[] | undefined = filters
    .find((filter) => filter.filterName === selectedFilterName)
    ?.values?.filter((value) => value)

  const handleValueChange = useCallback(
    (value: string) => {
      setSelectedFilterValue(value)
      if (!isEmpty(selectedFilterName) && !isEmpty(value)) {
        onChange({
          name: selectedFilterName,
          value: value,
        })
      }
      setTimeout(() => {
        setSelectedFilterValue("")
      }, 0)
    },
    [selectedFilterName, setSelectedFilterValue, onChange]
  )

  const getSelectProps = (): SelectProps & { "data-testid"?: string } => ({
    className: "w-full sm:flex-1 sm:min-w-0",
    name: "filter",
    "data-testid": "select-filterValue",
    label: t`Filters`,
    value: selectedFilterName,
    onChange: (value: string | number | string[] | undefined) => {
      setSelectedFilterName(String(value))
    },
  })

  const getComboBoxProps = (): ComboBoxProps & { "data-testid"?: string } => ({
    className: "w-full sm:flex-1 sm:min-w-0",
    name: "filterValue",
    "data-testid": "combobox-filterValue",
    value: selectedFilterValue,
    disabled: !selectedFilterName,
    onChange: handleValueChange,
  })

  return (
    <InputGroup className="flex w-full flex-col sm:w-auto sm:flex-row sm:items-end">
      <Select {...getSelectProps()}>
        {filters?.map(({ displayName, filterName }) => (
          <SelectOption value={filterName} label={displayName} key={filterName} data-testid={filterName} />
        ))}
      </Select>
      <ComboBox {...getComboBoxProps()}>
        {filterValues?.map((value) => <ComboBoxOption value={value} key={value} label={value} data-testid={value} />)}
      </ComboBox>
    </InputGroup>
  )
}

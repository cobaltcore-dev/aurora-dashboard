import { useCallback, useState } from "react"
import {
  InputGroup,
  ComboBox,
  ComboBoxProps,
  ComboBoxOption,
  SelectOption,
  Select,
  SelectProps,
  Stack,
  StackProps,
} from "@cloudoperators/juno-ui-components"
import { Filter, SelectedFilter } from "./types"
import { useLingui } from "@lingui/react/macro"

export type FiltersInputProps = {
  /** Array of available filters that can be selected. Each filter contains a name, display name, and possible values. */
  filters: Filter[]
  /** Callback function invoked when a filter value is selected. Receives the selected filter object containing name and value. */
  onChange: (filter: SelectedFilter) => void
  /** Optional props to customize the Stack wrapper component that contains the input elements. */
  inputWrapperProps?: StackProps
  /** Optional props to customize the Select component used for choosing the filter name/type. */
  selectInputProps?: SelectProps
  /** Optional props to customize the ComboBox component used for entering/selecting the filter value. */
  comboBoxInputProps?: ComboBoxProps
}

/**
 * Utility function to check if a value is empty
 * @param value - The value to check
 * @returns true if the value is null, undefined, empty string, empty array, empty Map, empty Set, or empty object
 */
function isEmpty(value: unknown) {
  if (value == null) return true // null or undefined
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

/**
 * FiltersInput Component
 *
 * A composite input component for selecting and applying filters. It consists of:
 * - A Select dropdown for choosing the filter type/name
 * - A ComboBox for entering or selecting the filter value (dynamically populated based on selected filter)
 * - A "Clear all" button to reset all applied filters
 *
 * The component manages internal state for the currently selected filter name and value,
 * and calls the `onChange` callback when a complete filter (name + value) is selected.
 */
export const FiltersInput = ({
  filters,
  onChange,
  inputWrapperProps = {},
  selectInputProps = {},
  comboBoxInputProps = {},
}: FiltersInputProps) => {
  const { t } = useLingui()

  const [selectedFilterName, setSelectedFilterName] = useState<string>("")
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("")

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

  /**
   * Returns default props for the Select component (filter name selector)
   * Includes default styling, labels, and change handlers
   */
  const getDefaultSelectProps = (): SelectProps & { "data-testid"?: string } => ({
    className: "filter-label-select w-64 mb-0",
    name: "filter",
    "data-testid": "select-filterValue",
    label: t`Filters`,
    value: selectedFilterName,
    onChange: (value: string | number | string[] | undefined) => {
      setSelectedFilterName(String(value))
    },
  })

  /**
   * Returns default props for the ComboBox component (filter value input)
   * Includes default styling, disabled state based on filter selection, and change handlers
   */
  const getDefaultComboBoxProps = (): ComboBoxProps & { "data-testid"?: string } => ({
    className: "filter-value-select w-48 bg-theme-background-lvl-0",
    name: "filterValue",
    "data-testid": "combobox-filterValue",
    value: selectedFilterValue,
    disabled: !selectedFilterName,
    onChange: handleValueChange,
  })

  return (
    <>
      <Stack alignment="center" gap="8" {...inputWrapperProps}>
        <InputGroup>
          {/* Filter name/type selector */}
          <Select {...getDefaultSelectProps()} {...selectInputProps}>
            {filters?.map(({ displayName, filterName }) => (
              <SelectOption value={filterName} label={displayName} key={filterName} data-testid={filterName} />
            ))}
          </Select>
          {/* Filter value input/selector - dynamically populated based on selected filter */}
          <ComboBox {...getDefaultComboBoxProps()} {...comboBoxInputProps}>
            {filterValues?.map((value) => (
              <ComboBoxOption value={value} key={value} label={value} data-testid={value} />
            ))}
          </ComboBox>
        </InputGroup>
      </Stack>
    </>
  )
}

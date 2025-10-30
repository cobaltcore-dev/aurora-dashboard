import { useCallback, useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { cn } from "@/client/utils/cn"
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

export type FiltersInputProps = {
  /** Array of available filters that can be selected */
  filters: Filter[]
  /** Callback function invoked when a complete filter (name + value) is selected */
  onChange: (filter: SelectedFilter) => void
  /** Optional props to customize the Stack wrapper component */
  filterWrapperProps?: StackProps
  /** Optional props to customize the Select component for choosing the filter type */
  selectInputProps?: SelectProps
  /** Optional props to customize the ComboBox component for entering the filter value */
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
 * A composite input component for selecting and applying filters, consisting of:
 * - Select dropdown for choosing the filter type
 * - ComboBox for entering the filter value (dynamically populated based on selected filter)
 *
 * Manages internal state for the selected filter name and value, calling onChange
 * when a complete filter is selected.
 */
export const FiltersInput = ({
  filters,
  onChange,
  filterWrapperProps = {},
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
   * Merges default props with user-provided props for the Stack wrapper.
   * Applies default alignment and spacing while preserving custom overrides.
   */
  const getDefaultFilterWrapperProps = (): StackProps => {
    return {
      alignment: "center",
      gap: "8",
      ...filterWrapperProps,
    }
  }

  /**
   * Merges default props with user-provided props for the Select component.
   * Connects filter type selection handlers while preserving custom overrides.
   */
  const getDefaultSelectProps = (): SelectProps & { "data-testid"?: string } => {
    const { className, ...restPros } = selectInputProps

    return {
      className: cn("filter-label-select w-64 mb-0", className),
      name: "filter",
      "data-testid": "select-filterValue",
      label: t`Filters`,
      value: selectedFilterName,
      onChange: (value: string | number | string[] | undefined) => {
        setSelectedFilterName(String(value))
      },
      ...restPros,
    }
  }

  /**
   * Merges default props with user-provided props for the ComboBox component.
   * Applies default styling, disabled state, and change handlers while preserving custom overrides.
   */
  const getDefaultComboBoxProps = (): ComboBoxProps & { "data-testid"?: string } => {
    const { className, ...restProps } = comboBoxInputProps

    return {
      className: cn("filter-value-select w-48 bg-theme-background-lvl-0", className),
      name: "filterValue",
      "data-testid": "combobox-filterValue",
      value: selectedFilterValue,
      disabled: !selectedFilterName,
      onChange: handleValueChange,
      ...restProps,
    }
  }

  return (
    <>
      <Stack {...getDefaultFilterWrapperProps()}>
        <InputGroup>
          {/* Filter name/type selector */}
          <Select {...getDefaultSelectProps()} {...selectInputProps}>
            {filters?.map(({ displayName, filterName }) => (
              <SelectOption value={filterName} label={displayName} key={filterName} data-testid={filterName} />
            ))}
          </Select>
          {/* Filter value input/selector - dynamically populated based on selected filter */}
          <ComboBox {...getDefaultComboBoxProps()}>
            {filterValues?.map((value) => (
              <ComboBoxOption value={value} key={value} label={value} data-testid={value} />
            ))}
          </ComboBox>
        </InputGroup>
      </Stack>
    </>
  )
}

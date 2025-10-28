import React from "react"
import {
  Stack,
  Select,
  SelectOption,
  SortButton,
  InputGroup,
  StackProps,
  InputGroupProps,
  SelectProps,
  ButtonProps,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { SortOption } from "./types"

/**
 * Props for the SortInput component
 */
export interface SortInputProps {
  /** Current sort key/field being used (e.g., "name", "vcpus", "created_at") */
  sortBy?: string | number | string[]
  /** Callback fired when the user selects a different sort option */
  onSortByChange: (param?: string | number | string[]) => void
  /** Current sort direction: "asc" for ascending, "desc" for descending */
  sortDirection: "asc" | "desc"
  /** Callback fired when the user toggles the sort direction */
  onSortDirectionChange: (direction: "asc" | "desc") => void
  /** Array of available sort options to display in the dropdown */
  options: SortOption[]
  /** Optional props to customize the Stack wrapper component that contains the input elements */
  sortWrapperProps?: StackProps
  /** Optional props to customize the InputGroup component that wraps the Select and SortButton */
  inputGroupProps?: InputGroupProps
  /** Optional props to customize the Select component used for choosing the sort field */
  selectInputProps?: SelectProps
  /** Optional props to customize the SortButton component used for toggling sort direction */
  sortButtonProps?: ButtonProps
}

/**
 * SortInput Component
 *
 * A reusable component that combines a dropdown select for choosing sort fields
 * with a direction toggle button for ascending/descending order.
 *
 * This component is fully controlled - it receives the current sort state via props
 * and notifies the parent component of changes through callback functions.
 *
 * The component provides several customization points through props that allow
 * overriding default behavior and styling of individual sub-components.
 */
export const SortInput: React.FC<SortInputProps> = ({
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  options,
  sortWrapperProps = {},
  inputGroupProps = {},
  selectInputProps = {},
  sortButtonProps = {},
}) => {
  const { t } = useLingui()

  /**
   * Returns default props for the Select component (sort field selector)
   * Merges default configuration with any custom props passed via selectInputProps
   *
   * @returns Props object for the Select component including data-testid for testing
   */
  const getDefaultSelectProps = (): SelectProps & { "data-testid"?: string } => ({
    onChange: onSortByChange,
    value: sortBy,
    "data-testid": "sort-select",
    label: t`Sort by`,
    ...selectInputProps,
  })

  /**
   * Returns default props for the SortButton component (direction toggle)
   * Merges default configuration with any custom props passed via sortButtonProps
   *
   * @returns Props object for the SortButton component including data-testid and order handlers
   */
  const getDefaultSortButtonProps = (): ButtonProps & {
    "data-testid"?: string
    order: "asc" | "desc"
    onOrderChange: (order: string) => void
  } => ({
    "data-testid": "direction-toggle",
    order: sortDirection,
    onOrderChange: (order: string) => onSortDirectionChange(order as "asc" | "desc"),
    ...sortButtonProps,
  })

  return (
    <Stack className={`flex flex-row items-center`} {...sortWrapperProps}>
      <InputGroup className="flex-shrink-0 w-full md:w-60" {...inputGroupProps}>
        <Select {...getDefaultSelectProps()}>
          {options.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
        <SortButton {...getDefaultSortButtonProps()} />
      </InputGroup>
    </Stack>
  )
}

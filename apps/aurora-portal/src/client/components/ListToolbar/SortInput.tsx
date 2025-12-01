import React from "react"
import { useLingui } from "@lingui/react/macro"
import { cn } from "@/client/utils/cn"
import {
  Select,
  SelectOption,
  SortButton,
  InputGroup,
  InputGroupProps,
  SelectProps,
  ButtonProps,
} from "@cloudoperators/juno-ui-components"
import { SortOption } from "./types"

/**
 * Props for the SortInput component
 */
export interface SortInputProps {
  /** Current sort field being used (e.g., "name", "vcpus", "created_at") */
  sortBy?: string | number | string[]
  /** Callback fired when the user selects a different sort field */
  onSortByChange: (param?: string | number | string[]) => void
  /** Current sort direction: "asc" for ascending, "desc" for descending */
  sortDirection: "asc" | "desc"
  /** Callback fired when the user toggles the sort direction */
  onSortDirectionChange: (direction: "asc" | "desc") => void
  /** Array of available sort options to display in the dropdown */
  options: SortOption[]
  /** Optional props to customize the InputGroup component */
  inputGroupProps?: InputGroupProps
  /** Optional props to customize the Select component for choosing the sort field */
  selectInputProps?: SelectProps
  /** Optional props to customize the SortButton component for toggling sort direction */
  sortButtonProps?: Omit<ButtonProps, "onChange">
}

/**
 * SortInput Component
 *
 * A controlled component combining a dropdown select for choosing sort fields
 * with a direction toggle button for ascending/descending order.
 *
 * Fully customizable sub-components via prop spreading.
 */
export const SortInput: React.FC<SortInputProps> = ({
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  options,
  inputGroupProps = {},
  selectInputProps = {},
  sortButtonProps = {},
}) => {
  const { t } = useLingui()

  /**
   * Merges default props with user-provided props for the InputGroup component.
   * Applies responsive width styling while preserving custom overrides.
   */
  const getDefaultInputGroupProps = (): InputGroupProps => {
    const { className, ...restProps } = inputGroupProps

    return {
      className: cn("flex-shrink-0", className),
      ...restProps,
    }
  }

  /**
   * Merges default props with user-provided props for the Select component.
   * Connects sort field selection handlers while preserving custom overrides.
   */
  const getDefaultSelectProps = (): SelectProps & { "data-testid"?: string } => ({
    onChange: onSortByChange,
    value: sortBy,
    "data-testid": "sort-select",
    label: t`Sort by`,
    ...selectInputProps,
  })

  /**
   * Merges default props with user-provided props for the SortButton component.
   * Connects sort direction toggle handlers while preserving custom overrides.
   */
  const getDefaultSortButtonProps = (): Omit<ButtonProps, "onChange"> & {
    "data-testid"?: string
    order: "asc" | "desc"
    onChange: (order: "asc" | "desc") => void
  } => ({
    "data-testid": "direction-toggle",
    order: sortDirection,
    onChange: onSortDirectionChange,
    ...sortButtonProps,
  })

  return (
    <InputGroup {...getDefaultInputGroupProps()}>
      <Select {...getDefaultSelectProps()}>
        {options.map((option) => (
          <SelectOption key={option.value} value={option.value}>
            {option.label}
          </SelectOption>
        ))}
      </Select>
      <SortButton {...getDefaultSortButtonProps()} />
    </InputGroup>
  )
}

import React from "react"
import { useLingui } from "@lingui/react/macro"
import { Select, SelectOption, SortButton, Stack, SelectProps, ButtonProps } from "@cloudoperators/juno-ui-components"
import { SortOption } from "./types"

export interface SortInputProps {
  sortBy?: string | number | string[]
  onSortByChange: (param?: string | number | string[]) => void
  sortDirection: "asc" | "desc"
  onSortDirectionChange: (direction: "asc" | "desc") => void
  options: SortOption[]
  selectClassName?: string
  /** Passed through to the underlying Select. "auto" sizes the toggle to its content (use with a `min-w-*` selectClassName floor) instead of the default "full" width. */
  selectWidth?: SelectProps["width"]
}

export const SortInput: React.FC<SortInputProps> = ({
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  options,
  selectClassName,
  selectWidth,
}) => {
  const { t } = useLingui()

  const getSelectProps = (): SelectProps & { "data-testid"?: string } => ({
    className: selectClassName,
    width: selectWidth,
    onChange: onSortByChange,
    value: sortBy,
    "data-testid": "sort-select",
    label: t`Sort by`,
  })

  const getSortButtonProps = (): Omit<ButtonProps, "onChange"> & {
    "data-testid"?: string
    order: "asc" | "desc"
    onChange: (order: "asc" | "desc") => void
  } => ({
    "data-testid": "direction-toggle",
    order: sortDirection,
    onChange: onSortDirectionChange,
  })

  return (
    <Stack gap="0.5" alignment="end" className="w-full sm:w-auto">
      <Select {...getSelectProps()}>
        {options.map((option) => (
          <SelectOption key={option.value} value={option.value}>
            {option.label}
          </SelectOption>
        ))}
      </Select>
      <SortButton {...getSortButtonProps()} />
    </Stack>
  )
}

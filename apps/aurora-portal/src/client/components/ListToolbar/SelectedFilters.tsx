import { useLingui } from "@lingui/react/macro"
import { cn } from "@/client/utils/cn"
import { Pill, Stack, Button, ButtonProps } from "@cloudoperators/juno-ui-components"
import { SelectedFilter } from "./types"

export type SelectedFiltersProps = {
  /**
   * Array of currently active filters to be displayed as closeable pills.
   */
  selectedFilters: SelectedFilter[]

  /** Optional props to customize the "Clear all" Button component. */
  clearButtonProps?: ButtonProps

  /**
   * Callback function invoked when a user removes an individual filter pill.
   */
  onDelete: (filter: SelectedFilter) => void

  /**
   * Callback function invoked when the "Clear all" button is clicked.
   */
  onClear: () => void
}

/**
 * SelectedFilters Component
 *
 * Displays currently active filters as closeable pill components with individual
 * remove buttons and an optional "Clear all" button (shown when 2+ filters are active).
 *
 * The pills are arranged in a flexible, wrapping layout that adapts to available space.
 */
export const SelectedFilters = ({
  selectedFilters,
  clearButtonProps = {},
  onDelete,
  onClear,
}: SelectedFiltersProps) => {
  const { t } = useLingui()

  /**
   * Merges default props with user-provided props for the "Clear all" Button component.
   * Applies default label, styling, and click handler while preserving custom overrides.
   */
  const getDefaultClearButtonProps = (): ButtonProps => {
    const { className, ...restProps } = clearButtonProps

    return {
      label: t`Clear all`,
      className: cn("ml-2", className),
      onClick: onClear,
      variant: "subdued",
      ...restProps,
    }
  }

  return (
    <Stack gap="2" wrap={true} alignment="center">
      {/* Render a closeable pill for each selected filter */}
      {selectedFilters.map((filter) => (
        <Pill
          key={`${filter.name}:${filter.value}`}
          closeable
          pillKey={filter.name}
          pillValue={filter.value}
          onClose={() => onDelete(filter)}
        />
      ))}
      {/* Button to clear all applied filters */}
      {selectedFilters.length > 1 && <Button {...getDefaultClearButtonProps()} />}
    </Stack>
  )
}

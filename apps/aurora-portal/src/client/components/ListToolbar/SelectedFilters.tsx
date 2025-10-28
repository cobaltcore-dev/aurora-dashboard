import { useLingui } from "@lingui/react/macro"
import { Pill, Stack, Button, ButtonProps } from "@cloudoperators/juno-ui-components"
import { SelectedFilter } from "./types"

export type SelectedFiltersProps = {
  /**
   * Array of currently selected/active filters to be displayed as pills.
   * Each filter contains a name (filter type) and value.
   * Optional - when undefined or empty, no pills are rendered.
   */
  selectedFilters: SelectedFilter[]

  /** Optional props to customize the "Clear all" Button component. */
  clearButtonProps?: ButtonProps

  /**
   * Callback function invoked when a user clicks the close button on a filter pill.
   * Receives the filter object that should be removed.
   */
  onDelete: (filter: SelectedFilter) => void

  /** Callback function invoked when the "Clear all" button is clicked to reset all filters. */
  onClear: () => void
}

/**
 * SelectedFilters Component
 *
 * Displays a collection of currently active filters as closeable pill components.
 * Each pill shows the filter name and value, with a close button that allows users
 * to remove individual filters.
 *
 * The pills are arranged in a flexible, wrapping stack layout that adapts to
 * available space, making it suitable for displaying varying numbers of filters.
 */
export const SelectedFilters = ({
  selectedFilters,
  clearButtonProps = {},
  onDelete,
  onClear,
}: SelectedFiltersProps) => {
  const { t } = useLingui()

  /**
   * Returns default props for the "Clear all" Button component
   * Includes default label, styling, and click handler
   */
  const getDefaultClearButtonProps = (): ButtonProps => ({
    label: t`Clear all`,
    className: "ml-4",
    onClick: onClear,
    variant: "subdued",
  })

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
      {selectedFilters.length > 1 && <Button {...getDefaultClearButtonProps()} {...clearButtonProps} />}
    </Stack>
  )
}

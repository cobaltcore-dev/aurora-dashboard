import { Pill, Stack } from "@cloudoperators/juno-ui-components"
import { SelectedFilter } from "./types"

type SelectedFiltersProps = {
  /**
   * Array of currently selected/active filters to be displayed as pills.
   * Each filter contains a name (filter type) and value.
   * Optional - when undefined or empty, no pills are rendered.
   */
  selectedFilters?: SelectedFilter[]
  /**
   * Callback function invoked when a user clicks the close button on a filter pill.
   * Receives the filter object that should be removed.
   */
  onDelete: (filter: SelectedFilter) => void
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
export const SelectedFilters = ({ selectedFilters, onDelete }: SelectedFiltersProps) => (
  <Stack gap="2" wrap={true}>
    {/* Render a closeable pill for each selected filter */}
    {selectedFilters?.map((filter) => (
      <Pill
        key={`${filter.name}:${filter.value}`}
        closeable
        pillKey={filter.name}
        pillValue={filter.value}
        onClose={() => onDelete(filter)}
      />
    ))}
  </Stack>
)

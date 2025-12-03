import { useLingui } from "@lingui/react/macro"
import { Pill, Stack } from "@cloudoperators/juno-ui-components"
import { SelectedFilter } from "./types"

export type SelectedFiltersProps = {
  /**
   * Array of currently active filters to be displayed as closeable pills.
   */
  selectedFilters: SelectedFilter[]

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
export const SelectedFilters = ({ selectedFilters, onDelete, onClear }: SelectedFiltersProps) => {
  const { t } = useLingui()

  return (
    <Stack gap="2" wrap={true} alignment="start" distribution="start">
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
      {selectedFilters.length > 1 && <Pill pillValue={t`Clear all`} className="ml-2" onClick={onClear} />}
    </Stack>
  )
}

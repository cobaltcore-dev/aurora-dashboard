import { useLingui } from "@lingui/react/macro"
import { Button, Pill, Stack } from "@cloudoperators/juno-ui-components"
import { Filter, SelectedFilter } from "./types"
import { resolveValueLabel } from "./valueLabels"

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

  /**
   * Optional filter definitions used to resolve human-readable labels for pills;
   * when omitted, raw name/value are shown.
   */
  filters?: Filter[]
}

/**
 * SelectedFilters Component
 *
 * Displays currently active filters as closeable pill components with individual
 * remove buttons and an optional "Clear all" button (shown when 2+ filters are active).
 *
 * The pills are arranged in a flexible, wrapping layout that adapts to available space.
 */
export const SelectedFilters = ({ selectedFilters, onDelete, onClear, filters }: SelectedFiltersProps) => {
  const { t } = useLingui()

  return (
    <Stack gap="2" wrap={true} alignment="start" distribution="start">
      {/* Render a closeable pill for each selected filter */}
      {selectedFilters.map((filter) => {
        const def = filters?.find((f) => f.filterName === filter.name)
        return (
          <Pill
            key={`${filter.name}:${filter.value}`}
            closeable
            pillKey={def?.displayName ?? filter.name}
            pillValue={resolveValueLabel(def, filter.value)}
            onClose={() => onDelete(filter)}
          />
        )
      })}
      {selectedFilters.length > 1 && <Button size="small" label={t`Clear all`} onClick={onClear} />}
    </Stack>
  )
}

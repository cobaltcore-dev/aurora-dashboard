import React from "react"
import { Pill, Stack } from "@cloudoperators/juno-ui-components"
import { SelectedFilter } from "./types"

type SelectedFiltersProps = {
  selectedFilters?: SelectedFilter[]
  onDelete: (filter: SelectedFilter) => void
}

export const SelectedFilters = ({ selectedFilters, onDelete }: SelectedFiltersProps) => (
  <Stack gap="2" wrap={true}>
    {selectedFilters?.map((filter) => (
      <Pill
        key={`${name}:${filter.value}`}
        closeable
        pillKey={filter.name}
        pillValue={filter.value}
        onClose={() => onDelete(filter)}
      />
    ))}
  </Stack>
)

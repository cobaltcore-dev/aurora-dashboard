import React, { useState } from "react"
import {
  Stack,
  Select,
  SelectOption,
  SortButton,
  InputGroup,
  SearchInput,
  Button,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

interface FilterToolbarProps {
  searchTerm: string
  setSearchTerm: (_term: string) => void
  sortBy: string
  handleSortByChange: (_term: string | number | string[] | undefined) => void
  sortDirection: "asc" | "desc"
  handleSortDirectionChange: (_term: "asc" | "desc") => void
  setCreateModalOpen: (_bool: boolean) => void
  canCreateFlavor?: boolean
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  sortBy,
  handleSortByChange,
  sortDirection,
  handleSortDirectionChange,
  setCreateModalOpen,
  canCreateFlavor,
}) => {
  const { t } = useLingui()
  const [debounceTimer, setDebounceTimer] = useState<number | undefined>(undefined)

  const handleSearchChange = (value: React.ChangeEvent<HTMLInputElement>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    const newTimer = window.setTimeout(() => {
      setSearchTerm(value.target.value)
    }, 500)
    setDebounceTimer(newTimer)
  }

  return (
    <Stack
      alignment="center"
      gap="6"
      className="bg-theme-background-lvl-1 p-4 flex flex-row items-center flex-wrap w-full"
    >
      <Stack className="flex flex-row items-center">
        <InputGroup className="flex-shrink-0 w-full md:w-60">
          <Select onChange={handleSortByChange} value={sortBy} data-testid="sort-select" label={t`sort by`}>
            <SelectOption value="name">{t`Name`}</SelectOption>
            <SelectOption value="vcpus">{t`VCPUs`}</SelectOption>
            <SelectOption value="ram">{t`RAM`}</SelectOption>
            <SelectOption value="disk">{t`Root Disk`}</SelectOption>
            <SelectOption value="OS-FLV-EXT-DATA:ephemeral">{t`Ephemeral Disk`}</SelectOption>
            <SelectOption value="swap">{t`Swap`}</SelectOption>
            <SelectOption value="rxtx_factor">{t`RX/TX Factor`}</SelectOption>
          </Select>
          <SortButton data-testid="direction-toggle" order={sortDirection} onChange={handleSortDirectionChange} />
        </InputGroup>
      </Stack>
      <SearchInput
        placeholder={t`Enter search term or regex`}
        value={searchTerm || ""}
        className="w-full md:w-70 flex-shrink-0"
        onInput={handleSearchChange}
        onClear={() => setSearchTerm("")}
        data-testid="search-input"
      />
      {canCreateFlavor && (
        <Stack direction="horizontal" className="flex-grow items-center justify-end">
          <Button
            label={t`Create Flavor`}
            onClick={() => {
              setCreateModalOpen(true)
            }}
            variant="primary"
          />
        </Stack>
      )}
    </Stack>
  )
}

export default FilterToolbar

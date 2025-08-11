import React, { useState } from "react"
import { Stack, Select, SelectOption, InputGroup, SearchInput } from "@cloudoperators/juno-ui-components"

interface FilterToolbarProps {
  searchTerm: string
  setSearchTerm: (_term: string) => void
  sortBy: string
  handleSortByChange: (_term: string | number | string[] | undefined) => void
  sortDirection: string
  handleSortDirectionChange: (_term: string | number | string[] | undefined) => void
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  sortBy,
  handleSortByChange,
  sortDirection,
  handleSortDirectionChange,
}) => {
  const [debounceTimer, setDebounceTimer] = useState<number | undefined>(undefined)

  const handleSearchChange = (value: React.ChangeEvent<HTMLInputElement>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    const newTimer = window.setTimeout(() => {
      setSearchTerm(value.target.value)
    }, 1500)
    setDebounceTimer(newTimer)
  }

  const filtersStyles = `
  bg-theme-background-lvl-1
  py-4
  px-4
  pb-4
  pt-4
  my-px
`

  return (
    <>
      <Stack alignment="center" gap="8" className={filtersStyles}>
        <Stack direction="vertical" gap="3" className="w-full">
          <Stack gap="6" className="flex flex-row items-center flex-wrap w-full">
            <SearchInput
              placeholder="Enter search term or regex"
              value={searchTerm || ""}
              className="w-full md:w-80 flex-shrink-0"
              onInput={handleSearchChange}
              onClear={() => setSearchTerm("")}
            />
            <Stack className="flex flex-row items-center">
              <InputGroup className="flex-shrink-0 w-full md:w-80">
                <Select onChange={handleSortByChange} value={sortBy}>
                  <SelectOption value="name">Name</SelectOption>
                  <SelectOption value="vcpus">VCPUs</SelectOption>
                  <SelectOption value="ram">RAM</SelectOption>
                  <SelectOption value="disk">Root Disk</SelectOption>
                  <SelectOption value="OS-FLV-EXT-DATA:ephemeral">Ephemeral Disk</SelectOption>
                  <SelectOption value="swap">Swap</SelectOption>
                  <SelectOption value="rxtx_factor">RX/TX Factor</SelectOption>
                </Select>
                <Select onChange={handleSortDirectionChange} value={sortDirection}>
                  <SelectOption value="asc">Ascending</SelectOption>
                  <SelectOption value="desc">Descending</SelectOption>
                </Select>
              </InputGroup>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </>
  )
}

export default FilterToolbar

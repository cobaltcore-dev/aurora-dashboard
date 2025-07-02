import { Filter } from "lucide-react"
import { Button, Select, SelectOption, SearchInput, Stack, InputGroup } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"

export type SortByType = "name-asc" | "name-desc" | "status" | "newest" | ""
interface SearchBarProps {
  searchTerm: string
  sortTerm: SortByType
  setSearchTerm: (value: string) => void
  setSortTerm: (value: SortByType) => void
  toggleFilters: () => void
  showFilters: boolean
}

export const SearchBar = ({
  searchTerm,
  setSearchTerm,
  toggleFilters,
  showFilters,
  setSortTerm,
  sortTerm,
}: SearchBarProps) => {
  const { t } = useLingui()

  return (
    <Stack
      direction="vertical"
      gap="4"
      className="bg-theme-background-lvl-1
  py-2
  px-4
  my-px"
    >
      <Stack alignment="center" gap="8">
        <InputGroup>
          <Button variant={showFilters ? "primary" : undefined} onClick={toggleFilters}>
            <Filter className="h-4 w-4 mr-2" />
            <Trans>Filters</Trans>
          </Button>
          <Select
            name="sort"
            value={sortTerm}
            label="Sort"
            onChange={(value) => {
              setSortTerm(value as SortByType)
            }}
            className="w-48"
          >
            <SelectOption value="">{t`Newest`}</SelectOption>
            <SelectOption value="name-asc">{t`Name (A-Z)`}</SelectOption>
            <SelectOption value="name-desc">{t`Name (Z-A)`}</SelectOption>
            <SelectOption value="status">{t`Status`}</SelectOption>
          </Select>
        </InputGroup>
        <SearchInput
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t`Search clusters...`}
          value={searchTerm}
          className="w-96 ml-auto"
        />
      </Stack>
    </Stack>
  )
}

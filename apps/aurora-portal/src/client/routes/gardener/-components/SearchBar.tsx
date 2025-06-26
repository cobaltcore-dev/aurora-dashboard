import { Filter } from "lucide-react"
import { Button, Select, SelectOption, SearchInput, Stack, InputGroup } from "@cloudoperators/juno-ui-components"

export type SortByType = "name-asc" | "name-desc" | "status" | "newest" | ""
// Search Bar component
interface SearchBarProps {
  searchTerm: string
  sortTearm: SortByType
  setSearchTerm: (value: string) => void
  setSortTearm: (value: SortByType) => void
  toggleFilters: () => void
  showFilters: boolean
}

export const SearchBar = ({
  searchTerm,
  setSearchTerm,
  toggleFilters,
  showFilters,
  setSortTearm,
  sortTearm,
}: SearchBarProps) => (
  <Stack
    direction="vertical"
    gap="4"
    className={`filters   bg-theme-background-lvl-1
  py-2
  px-4
  my-px`}
  >
    <Stack alignment="center" gap="8">
      <InputGroup>
        <Button variant={showFilters ? "primary" : undefined} onClick={toggleFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Select
          name="sort"
          value={sortTearm}
          label="Sort"
          onChange={(value) => {
            setSortTearm(value as SortByType)
          }}
          className="w-48"
        >
          <SelectOption value="">Newest</SelectOption>
          <SelectOption value="name-asc">Name (A-Z)</SelectOption>
          <SelectOption value="name-desc">Name (Z-A)</SelectOption>
          <SelectOption value="status">Status</SelectOption>
        </Select>
      </InputGroup>
      <SearchInput
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search clusters..."
        value={searchTerm}
        className="w-96 ml-auto"
      />
    </Stack>
  </Stack>
)

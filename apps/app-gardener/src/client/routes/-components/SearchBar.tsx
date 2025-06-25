import { Filter } from "lucide-react"
import { GardenerSelect } from "./ui/GardenerSelect"
import { Button } from "@cloudoperators/juno-ui-components"

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
  <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center border-b border-aurora-gray-800 pb-4 mb-6 gap-4">
    <div className="flex flex-grow items-center">
      <div className="relative flex-grow">
        <input
          type="text"
          placeholder="Search clusters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-aurora-gray-800 border border-aurora-gray-700 rounded-md text-aurora-gray-300 focus:outline-none focus:ring-1 focus:ring-aurora-blue-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-aurora-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>

    <div className="flex gap-2 shrink-0">
      <Button variant={showFilters ? "primary" : undefined} onClick={toggleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>
      <GardenerSelect
        name="sort"
        value={sortTearm}
        onChange={(e) => {
          setSortTearm(e.target.value as SortByType)
        }}
        className="bg-aurora-gray-800 border border-aurora-gray-700 rounded-md px-3 py-1 text-aurora-gray-300 text-sm"
      >
        <option value="">Sort: Newest</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="status">Status</option>
      </GardenerSelect>
    </div>
  </div>
)

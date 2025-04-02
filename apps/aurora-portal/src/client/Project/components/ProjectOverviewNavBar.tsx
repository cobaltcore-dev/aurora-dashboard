import { ComboBox, ComboBoxOption } from "../../components/ComboBox"
import { Button } from "../../components/Button"
import { Icon } from "../../components/Icon"
import { Search } from "../../components/Search"
export type ViewMode = "list" | "card"

type ProjectsOverviewNavBarProps = {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  onChange: (term: string) => void
  searchPlaceholder?: string
  filters?: { label: string; value: string }[]
}

export function ProjectsOverviewNavBar({
  viewMode,
  setViewMode,
  onChange: handleSearchChange,
}: ProjectsOverviewNavBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Search Input (60%) */}
      <div className="flex-1 min-w-[60%] relative flex items-center bg-[#1c2026] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
        <Icon name="search" className="text-gray-400 mr-2" />
        <Search onChange={handleSearchChange} />
      </div>

      {/* Controls (30%) */}

      <div className="flex items-center gap-2 min-w-[30%] justify-end">
        <ComboBox valueLabel={"Sorting..."}>
          <ComboBoxOption value="name">Sort By name</ComboBoxOption>
          <ComboBoxOption value="Date">Sort by date</ComboBoxOption>
        </ComboBox>
        <div className="flex items-center gap-1 bg-juno-grey-blue-7 rounded-md">
          <Button
            data-testid="list-view"
            variant={viewMode === "list" ? "default" : "subdued"}
            className="text-white text-xs flex items-center justify-center rounded"
            onClick={() => setViewMode("list")}
            icon="dns"
          />

          <Button
            data-testid="card-view"
            variant={viewMode === "card" ? "default" : "subdued"}
            className="text-white text-xs flex items-center justify-center rounded"
            onClick={() => setViewMode("card")}
            icon="autoAwesomeMotion"
          />
        </div>
        <ComboBox valueLabel="Add new...">
          <ComboBoxOption value="project">Project</ComboBoxOption>
        </ComboBox>
      </div>
    </div>
  )
}

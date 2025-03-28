import { useState, useEffect, useRef } from "react"
import { ComboBox, ComboBoxOption } from "../../components/ComboBox"
import { Button } from "../../components/Button"
import { Icon } from "../../components/Icon"
import { useAuroraContext } from "../../Shell/AuroraProvider"
export type ViewMode = "list" | "card"

type ProjectsOverviewNavBarProps = {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  searchPlaceholder?: string
  filters?: { label: string; value: string }[]
}

export function ProjectsOverviewNavBar({ viewMode, setViewMode }: ProjectsOverviewNavBarProps) {
  const { setProjectSearchTerm, projectSearchTerm } = useAuroraContext()
  const [searchTerm, setSearchTerm] = useState<string>(projectSearchTerm)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSetServerSearchTerm = (term: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setProjectSearchTerm(term)
    }, 500)
  }

  useEffect(() => {
    debouncedSetServerSearchTerm(searchTerm)
  }, [searchTerm])

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Search Input (60%) */}
      <div className="flex-1 min-w-[60%] relative flex items-center bg-[#1c2026] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
        <Icon name="search" className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-full"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
          }}
        />
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

import { useEffect } from "react"
import { Button, InputGroup, SearchInput, Stack } from "@cloudoperators/juno-ui-components"
export type ViewMode = "list" | "card"

type ProjectsOverviewNavBarProps = {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  searchPlaceholder?: string
  filters?: { label: string; value: string }[]
  searchTerm?: string
  onSearch: (value: string) => void
}

export function ProjectsOverviewNavBar({ viewMode, setViewMode, onSearch, searchTerm }: ProjectsOverviewNavBarProps) {
  let timer: NodeJS.Timeout | null = null
  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  return (
    <>
      <Stack alignment="center" gap="8" className="mt-4 my-px px-4">
        <Stack direction="vertical" gap="3" className="w-full">
          <Stack gap="6" className="flex flex-wrap  w-full">
            <SearchInput
              className="flex-grow flex-shrink-0 basis-0"
              type="text"
              placeholder="Search..."
              onChange={handleSearchChange}
              defaultValue={searchTerm}
            />

            <InputGroup>
              <Button
                variant={viewMode === "list" ? "default" : "subdued"}
                onClick={() => setViewMode("list")}
                icon="dns"
              />

              <Button
                variant={viewMode === "card" ? "default" : "subdued"}
                onClick={() => setViewMode("card")}
                icon="autoAwesomeMotion"
              />
            </InputGroup>
          </Stack>
        </Stack>
      </Stack>
    </>
  )
}

import { useEffect, useRef, useState } from "react"
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

export function ProjectsOverviewNavBar({
  viewMode,
  setViewMode,
  onSearch,
  searchTerm = "",
}: ProjectsOverviewNavBarProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [inputValue, setInputValue] = useState(searchTerm)

  // because Juno dont have a uncontrolled default value we need to
  // set input to stop laggs, if set from outside (just on loading)
  useEffect(() => {
    setInputValue(searchTerm)
  }, [searchTerm])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value) // Instant UI update because of controlled value.

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  return (
    <>
      <Stack alignment="center" gap="8" className="mt-4 my-px px-4">
        <Stack direction="vertical" gap="3" className="w-full">
          <Stack gap="6" className="flex flex-wrap w-full">
            <SearchInput
              className="flex-grow flex-shrink-0 basis-0"
              type="text"
              placeholder="Search..."
              onChange={handleSearchChange}
              value={inputValue}
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

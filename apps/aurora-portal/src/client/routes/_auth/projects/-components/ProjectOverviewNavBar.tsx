import { ChangeEvent, useEffect, useRef, useState } from "react"
import { Button, InputGroup, SearchInput, Stack } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
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
  const { t } = useLingui()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [inputValue, setInputValue] = useState(searchTerm)
  const isMountedRef = useRef(false)

  // Sync external searchTerm only on initial mount, not on every URL update triggered by typing
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      setInputValue(searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value) // Instant UI update because of controlled value.

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  const handleClear = () => {
    setInputValue("")
    onSearch("")
  }

  return (
    <>
      <Stack alignment="center" gap="8" className="my-px mt-4 px-4">
        <Stack direction="vertical" gap="3" className="w-full">
          <Stack gap="6" className="flex w-full flex-wrap">
            <SearchInput
              className="flex-shrink-0 flex-grow basis-0"
              type="text"
              placeholder={t`Search...`}
              onChange={handleSearchChange}
              onClear={handleClear}
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

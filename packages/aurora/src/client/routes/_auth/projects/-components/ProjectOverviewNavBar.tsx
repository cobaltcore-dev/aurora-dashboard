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
  const inputFocusedRef = useRef(false)
  const [inputValue, setInputValue] = useState(searchTerm)

  // Sync from URL (e.g. back/forward navigation) only when user isn't actively editing
  useEffect(() => {
    if (!inputFocusedRef.current && !timerRef.current && searchTerm !== inputValue) {
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
    setInputValue(value)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onSearch(value)
    }, 300)
  }

  const handleClear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setInputValue("")
    onSearch("")
  }

  return (
    <>
      <Stack alignment="center" gap="8" className="my-px mt-4 px-4">
        <Stack direction="vertical" gap="3" className="w-full">
          <Stack gap="6" className="flex w-full flex-wrap">
            <SearchInput
              className="shrink-0 grow basis-0"
              type="text"
              placeholder={t`Search...`}
              onChange={handleSearchChange}
              onFocus={() => {
                inputFocusedRef.current = true
              }}
              onBlur={() => {
                inputFocusedRef.current = false
              }}
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

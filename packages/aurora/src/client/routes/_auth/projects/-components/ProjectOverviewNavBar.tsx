import { ChangeEvent, useEffect, useRef, useState } from "react"
import { SearchInput } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

type ProjectsOverviewNavBarProps = {
  searchTerm?: string
  onSearch: (value: string) => void
}

export function ProjectsOverviewNavBar({ onSearch, searchTerm = "" }: ProjectsOverviewNavBarProps) {
  const { t } = useLingui()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputFocusedRef = useRef(false)
  const [inputValue, setInputValue] = useState(searchTerm)

  useEffect(() => {
    if (!inputFocusedRef.current && !timerRef.current && searchTerm !== inputValue) {
      setInputValue(searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (timerRef.current) clearTimeout(timerRef.current)
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
    <SearchInput
      className="w-full"
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
  )
}

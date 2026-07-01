import { useState, useRef, useEffect, useCallback } from "react"

const MAX_COMBO_OPTIONS = 50

interface UseBucketSearchResult {
  searchTerm: string
  debouncedSearch: string
  visibleBuckets: Array<{ name: string }>
  hiddenCount: number
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  reset: () => void
}

/**
 * Debounced bucket search with result limiting
 * Shared between Copy and Move modals
 */
export const useBucketSearch = (allBuckets: Array<{ name: string }> | undefined): UseBucketSearchResult => {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    },
    []
  )

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const reset = useCallback(() => {
    setSearchTerm("")
    setDebouncedSearch("")
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }, [])

  // Filter and limit results
  const filteredBuckets =
    debouncedSearch.trim().length > 0
      ? (allBuckets ?? []).filter((b) => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : (allBuckets ?? [])

  const visibleBuckets = filteredBuckets.slice(0, MAX_COMBO_OPTIONS)
  const hiddenCount = filteredBuckets.length - visibleBuckets.length

  return {
    searchTerm,
    debouncedSearch,
    visibleBuckets,
    hiddenCount,
    handleSearchChange,
    reset,
  }
}

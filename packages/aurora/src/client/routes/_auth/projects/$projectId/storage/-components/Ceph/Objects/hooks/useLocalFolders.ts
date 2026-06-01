import { useState, useCallback } from "react"

interface UseLocalFoldersResult {
  localFolders: Record<string, string[]>
  addFolder: (bucket: string, path: string) => void
  clearForBucket: (bucket: string) => void
  reset: () => void
}

/**
 * Manages locally created folders (not yet persisted to S3)
 * Folders are created as empty prefixes when user navigates into them
 */
export const useLocalFolders = (): UseLocalFoldersResult => {
  const [localFolders, setLocalFolders] = useState<Record<string, string[]>>({})

  const addFolder = useCallback((bucket: string, path: string) => {
    setLocalFolders((prev) => ({
      ...prev,
      [bucket]: [...(prev[bucket] ?? []), path],
    }))
  }, [])

  const clearForBucket = useCallback((bucket: string) => {
    setLocalFolders((prev) => {
      const next = { ...prev }
      delete next[bucket]
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setLocalFolders({})
  }, [])

  return {
    localFolders,
    addFolder,
    clearForBucket,
    reset,
  }
}

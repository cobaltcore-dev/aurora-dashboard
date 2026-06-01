import { useState, useCallback } from "react"
import { useLingui } from "@lingui/react/macro"
import { validateFolderName } from "../utils/objectValidation"

interface BrowserRow {
  kind: "folder" | "object"
  name: string
  displayName: string
}

interface UseObjectBrowserResult {
  currentPrefix: string
  newFolderName: string
  newFolderError: string | null
  showNewFolderInput: boolean
  navigateToPrefix: (prefix: string) => void
  navigateUp: () => void
  startCreateFolder: () => void
  cancelCreateFolder: () => void
  setNewFolderName: (name: string) => void
  createFolder: () => string | null
  reset: () => void
}

/**
 * Manages object browser navigation and inline folder creation
 * Shared between Copy and Move modals
 */
export const useObjectBrowser = (
  existingRows: BrowserRow[],
  onFolderCreated?: (path: string) => void
): UseObjectBrowserResult => {
  const { t } = useLingui()
  const [currentPrefix, setCurrentPrefix] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderError, setNewFolderError] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)

  const navigateToPrefix = useCallback((prefix: string) => {
    setCurrentPrefix(prefix)
    setShowNewFolderInput(false)
    setNewFolderName("")
    setNewFolderError(null)
  }, [])

  const navigateUp = useCallback(() => {
    if (!currentPrefix) return
    const parts = currentPrefix.replace(/\/$/, "").split("/")
    parts.pop()
    const newPrefix = parts.length > 0 ? parts.join("/") + "/" : ""
    navigateToPrefix(newPrefix)
  }, [currentPrefix, navigateToPrefix])

  const startCreateFolder = useCallback(() => {
    setShowNewFolderInput(true)
    setNewFolderName("")
    setNewFolderError(null)
  }, [])

  const cancelCreateFolder = useCallback(() => {
    setShowNewFolderInput(false)
    setNewFolderName("")
    setNewFolderError(null)
  }, [])

  const handleSetNewFolderName = useCallback(
    (name: string) => {
      setNewFolderName(name)
      if (newFolderError) setNewFolderError(null)
    },
    [newFolderError]
  )

  const createFolder = useCallback((): string | null => {
    const existingNames = existingRows.map((r) => r.name)
    const error = validateFolderName(newFolderName, existingNames, currentPrefix)

    if (error) {
      setNewFolderError(t(error.message))
      return null
    }

    const trimmed = newFolderName.trim()
    const newPath = `${currentPrefix}${trimmed}/`

    onFolderCreated?.(newPath)
    setNewFolderName("")
    setShowNewFolderInput(false)
    setNewFolderError(null)
    setCurrentPrefix(newPath)

    return newPath
  }, [newFolderName, existingRows, currentPrefix, onFolderCreated, t])

  const reset = useCallback(() => {
    setCurrentPrefix("")
    setNewFolderName("")
    setNewFolderError(null)
    setShowNewFolderInput(false)
  }, [])

  return {
    currentPrefix,
    newFolderName,
    newFolderError,
    showNewFolderInput,
    navigateToPrefix,
    navigateUp,
    startCreateFolder,
    cancelCreateFolder,
    setNewFolderName: handleSetNewFolderName,
    createFolder,
    reset,
  }
}

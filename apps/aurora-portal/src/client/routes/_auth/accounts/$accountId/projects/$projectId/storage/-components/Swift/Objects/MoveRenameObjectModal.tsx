import { useState, useRef, useEffect, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  Spinner,
  ComboBox,
  ComboBoxOption,
  TextInput,
  Message,
  Button,
} from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { MdFolder, MdDescription, MdCreateNewFolder, MdArrowBack } from "react-icons/md"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ObjectRow, buildRows, BrowserRow } from "./"
import { ObjectSummary } from "@/server/Storage/types/swift"

const MAX_COMBO_OPTIONS = 50

interface MoveRenameObjectModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onSuccess?: (objectName: string, targetContainer: string, targetPath: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const MoveRenameObjectModal = ({ isOpen, object, onClose, onSuccess, onError }: MoveRenameObjectModalProps) => {
  const { t } = useLingui()
  const { containerName: sourceContainer } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()
  const submittedNameRef = useRef("")

  // ── State ──────────────────────────────────────────────────────────────────
  const [targetContainer, setTargetContainer] = useState(sourceContainer)
  const [currentPrefix, setCurrentPrefix] = useState("")
  const [newObjectName, setNewObjectName] = useState("")
  const [newObjectNameError, setNewObjectNameError] = useState<string | null>(null)
  // Locally created folders — keyed by container, stored as full prefix paths.
  const [localFolders, setLocalFolders] = useState<Record<string, string[]>>({})
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderError, setNewFolderError] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [containerSearch, setContainerSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens or target container changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPrefix("")
      setLocalFolders({})
      setNewFolderName("")
      setNewFolderError(null)
      setShowNewFolderInput(false)
      setContainerSearch("")
      setDebouncedSearch("")
      setNewObjectNameError(null)
    }
  }, [isOpen, targetContainer])

  // Reset name field when object changes (modal reopened for a different object)
  useEffect(() => {
    if (isOpen && object) {
      setNewObjectName(object.displayName)
    }
  }, [isOpen, object])

  useEffect(() => {
    if (!isOpen) {
      setTargetContainer(sourceContainer)
      setCurrentPrefix("")
      setLocalFolders({})
      setNewFolderName("")
      setNewFolderError(null)
      setShowNewFolderInput(false)
      setContainerSearch("")
      setDebouncedSearch("")
      setNewObjectName("")
      setNewObjectNameError(null)
    }
  }, [isOpen, sourceContainer])

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: containers, isLoading: isLoadingContainers } = trpcReact.storage.swift.listContainers.useQuery(
    {},
    { enabled: isOpen }
  )

  const { data: objects, isLoading: isLoadingObjects } = trpcReact.storage.swift.listObjects.useQuery(
    { container: targetContainer, format: "json", prefix: currentPrefix || undefined },
    { enabled: isOpen && !!targetContainer }
  )

  // ── Rows: merge server data with locally created folders ───────────────────

  const serverRows = buildRows((objects ?? []) as ObjectSummary[], currentPrefix)
  const containerLocalFolders = localFolders[targetContainer] ?? []
  const localFolderRows: BrowserRow[] = containerLocalFolders
    .filter((fp) => {
      const withoutPrefix = fp.startsWith(currentPrefix) ? fp.slice(currentPrefix.length) : null
      if (!withoutPrefix) return false
      const parts = withoutPrefix.split("/").filter(Boolean)
      return parts.length === 1
    })
    .filter((fp) => !serverRows.some((r) => r.name === fp))
    .map((fp) => ({
      kind: "folder" as const,
      name: fp,
      displayName: fp.slice(currentPrefix.length).replace(/\/$/, ""),
    }))

  const rows: BrowserRow[] = [
    ...serverRows.filter((r) => r.kind === "folder"),
    ...localFolderRows,
    ...serverRows.filter((r) => r.kind === "object"),
  ]

  const filteredContainers =
    debouncedSearch.trim().length > 0
      ? (containers ?? []).filter((c) => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : []

  const visibleContainers = filteredContainers.slice(0, MAX_COMBO_OPTIONS)
  const hiddenCount = filteredContainers.length - visibleContainers.length

  // ── Move = copy + delete ───────────────────────────────────────────────────
  // Swift has no native move. We copy to the destination then delete the source.
  // Both mutations are chained: delete fires in copyMutation.onSuccess.

  const deleteMutation = trpcReact.storage.swift.deleteObject.useMutation({
    onSuccess: () => {
      utils.storage.swift.listObjects.invalidate()
      onSuccess?.(submittedNameRef.current, targetContainer, currentPrefix)
    },
    onError: (error) => {
      // Copy succeeded but delete failed — report as move error so the user
      // knows the source object still exists.
      onError?.(submittedNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const copyMutation = trpcReact.storage.swift.copyObject.useMutation({
    onSuccess: () => {
      if (!object) return
      // Copy succeeded — now delete the source to complete the move.
      deleteMutation.mutate({
        container: sourceContainer,
        object: object.name,
      })
    },
    onError: (error) => {
      onError?.(submittedNameRef.current, error.message)
      handleClose()
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClose = () => {
    copyMutation.reset()
    deleteMutation.reset()
    onClose()
  }

  const handleContainerSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setContainerSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const handleContainerChange = (value?: string | number | string[] | undefined) => {
    const v = Array.isArray(value) ? value[0] : typeof value === "number" ? String(value) : value
    if (v) {
      setTargetContainer(v)
      setCurrentPrefix("")
    }
  }

  const handleFolderClick = (folderName: string) => {
    setCurrentPrefix(folderName)
    setShowNewFolderInput(false)
    setNewFolderName("")
    setNewFolderError(null)
  }

  const handleNavigateUp = () => {
    if (!currentPrefix) return
    const parts = currentPrefix.replace(/\/$/, "").split("/")
    parts.pop()
    setCurrentPrefix(parts.length > 0 ? parts.join("/") + "/" : "")
    setShowNewFolderInput(false)
    setNewFolderName("")
    setNewFolderError(null)
  }

  const validateNewFolderName = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim()
      if (!trimmed) {
        setNewFolderError(t`Folder name is required`)
        return false
      }
      if (trimmed.includes("/")) {
        setNewFolderError(t`Folder name cannot contain slashes`)
        return false
      }
      if (trimmed !== name) {
        setNewFolderError(t`Folder name cannot have leading or trailing whitespace`)
        return false
      }
      const newPath = `${currentPrefix}${trimmed}/`
      if (rows.some((r) => r.name === newPath)) {
        setNewFolderError(t`A folder with this name already exists`)
        return false
      }
      setNewFolderError(null)
      return true
    },
    [rows, currentPrefix, t]
  )

  const validateObjectName = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim()
      if (!trimmed) {
        setNewObjectNameError(t`Object name is required`)
        return false
      }
      if (trimmed.includes("/")) {
        setNewObjectNameError(t`Object name cannot contain slashes`)
        return false
      }
      if (trimmed !== name) {
        setNewObjectNameError(t`Object name cannot have leading or trailing whitespace`)
        return false
      }
      setNewObjectNameError(null)
      return true
    },
    [t]
  )

  const handleCreateFolder = () => {
    if (!validateNewFolderName(newFolderName)) return
    const trimmed = newFolderName.trim()
    const newPath = `${currentPrefix}${trimmed}/`
    setLocalFolders((prev) => ({
      ...prev,
      [targetContainer]: [...(prev[targetContainer] ?? []), newPath],
    }))
    setNewFolderName("")
    setShowNewFolderInput(false)
    setNewFolderError(null)
    setCurrentPrefix(newPath)
  }

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreateFolder()
    if (e.key === "Escape") {
      setShowNewFolderInput(false)
      setNewFolderName("")
      setNewFolderError(null)
    }
  }

  const handleMove = () => {
    if (!object) return
    if (!validateObjectName(newObjectName)) return
    const trimmedName = newObjectName.trim()
    submittedNameRef.current = trimmedName
    // destination format: "/targetContainer/prefix/newName" (plain text)
    // Encoding is handled in the router to avoid double-encoding.
    const destPath = `/${targetContainer}/${currentPrefix}${trimmedName}`
    copyMutation.mutate({
      container: sourceContainer,
      object: object.name,
      destination: destPath,
      freshMetadata: false,
    })
  }

  // ── Virtualized folder browser ─────────────────────────────────────────────
  // Must be declared before the early return to satisfy Rules of Hooks.
  const folderRows = rows.filter((r) => r.kind === "folder")
  const objectRows = rows.filter((r) => r.kind === "object")
  const allBrowserRows = [...folderRows, ...objectRows]

  const rowVirtualizer = useVirtualizer({
    count: allBrowserRows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32,
    overscan: 5,
  })

  if (!isOpen || !object) return null

  const isPending = copyMutation.isPending || deleteMutation.isPending
  const isLoading = isLoadingObjects

  // ── Read-only target path preview ──────────────────────────────────────────
  const targetPathDisplay = `/${targetContainer}/${currentPrefix}${newObjectName.trim() || object.displayName}`

  // The initial prefix is the folder the source object lives in —
  // strip the displayName from the end of the full object name to get it.
  const initialPrefix = object.name.endsWith(object.displayName)
    ? object.name.slice(0, object.name.length - object.displayName.length)
    : ""

  // Disable submit when the destination is identical to the source —
  // same container, same folder prefix, and same object name means nothing would change.
  const isUnchanged =
    targetContainer === sourceContainer &&
    currentPrefix === initialPrefix &&
    newObjectName.trim() === object.displayName

  return (
    <Modal
      title={
        <span className="flex max-w-[500px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Move/Rename object:</Trans>
          </span>
          <span className="truncate font-mono" title={object.displayName}>
            {object.displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Moving...` : t`Move`}
      onConfirm={handleMove}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isPending || isLoadingContainers || isUnchanged}
    >
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Moving object...</Trans>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          {/* New object name */}
          <TextInput
            label={t`New object name`}
            value={newObjectName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewObjectName(e.target.value)
              if (newObjectNameError) setNewObjectNameError(null)
            }}
            invalid={!!newObjectNameError}
            errortext={newObjectNameError ?? undefined}
            helptext={t`You can rename the object by changing the name here.`}
            required
          />

          {/* Target container */}
          <ComboBox
            label={t`Target container`}
            value={targetContainer}
            onChange={handleContainerChange}
            onInputChange={handleContainerSearch}
            placeholder={t`Type to search containers…`}
            helptext={(() => {
              if (isLoadingContainers) return t`Loading containers...`
              if (containerSearch.trim().length === 0) return t`Start typing to search for a container`
              if (hiddenCount > 0) {
                const maxOptions = MAX_COMBO_OPTIONS
                const totalCount = filteredContainers.length
                return t`Showing first ${maxOptions} of ${totalCount} — refine your search to narrow results`
              }
              return undefined
            })()}
            disabled={isLoadingContainers || isPending}
            required
          >
            {visibleContainers.map((c) => (
              <ComboBoxOption key={c.name} value={c.name}>
                {c.name}
              </ComboBoxOption>
            ))}
          </ComboBox>

          {/* Folder browser */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">
                <Trans>Select destination folder</Trans>
              </span>
              <Button
                size="small"
                variant="subdued"
                icon="addCircle"
                onClick={() => {
                  setShowNewFolderInput(true)
                  setNewFolderName("")
                  setNewFolderError(null)
                }}
                disabled={isPending}
                title={t`Create new folder here`}
              >
                <Trans>New Folder</Trans>
              </Button>
            </div>

            {/* Breadcrumb / back navigation */}
            <div className="border-theme-background-lvl-2 bg-theme-background-lvl-1 flex items-center gap-2 border-b px-3 py-2 text-sm">
              {currentPrefix ? (
                <button
                  type="button"
                  onClick={handleNavigateUp}
                  className="text-theme-link hover:text-theme-default flex items-center gap-1"
                >
                  <MdArrowBack size={16} />
                  <Trans>Back</Trans>
                </button>
              ) : (
                <span className="text-theme-light">
                  <Trans>Root</Trans>
                </span>
              )}
              {currentPrefix && <span className="text-theme-light truncate font-mono text-xs">/ {currentPrefix}</span>}
            </div>

            {/* Object browser list */}
            <div ref={listRef} className="border-theme-background-lvl-2 max-h-56 overflow-y-auto rounded-b border">
              {isLoading ? (
                <Stack direction="horizontal" alignment="center" gap="2" className="py-6">
                  <Spinner size="small" />
                  <Trans>Loading...</Trans>
                </Stack>
              ) : allBrowserRows.length === 0 && !showNewFolderInput ? (
                <div className="text-theme-light px-4 py-6 text-center text-sm">
                  <Trans>This folder is empty — use New Folder to create one.</Trans>
                </div>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = allBrowserRows[virtualRow.index]
                    const isFolder = row.kind === "folder"
                    return (
                      <div
                        key={row.name}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isFolder ? (
                          <button
                            type="button"
                            className="hover:bg-theme-background-lvl-2 focus-visible:outline-theme-focus flex w-full items-center gap-2 px-4 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2"
                            onClick={() => handleFolderClick(row.name)}
                          >
                            <MdFolder size={16} className="text-theme-light shrink-0" />
                            <span className="truncate">{row.displayName}</span>
                          </button>
                        ) : (
                          /* Files shown as non-clickable, dimmed — for context only */
                          <span className="text-theme-light flex items-center gap-2 px-4 py-2 text-sm">
                            <MdDescription size={16} className="shrink-0" />
                            <span className="truncate">{row.displayName}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Inline new folder input */}
              {showNewFolderInput && (
                <div className="border-theme-background-lvl-2 border-t px-4 py-3">
                  <Stack direction="vertical" gap="2">
                    <Stack direction="horizontal" gap="2" alignment="center">
                      <MdCreateNewFolder size={16} className="text-theme-light shrink-0" />
                      <TextInput
                        value={newFolderName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setNewFolderName(e.target.value)
                          if (newFolderError) setNewFolderError(null)
                        }}
                        onKeyDown={handleNewFolderKeyDown}
                        placeholder={t`new-folder-name`}
                        invalid={!!newFolderError}
                        errortext={newFolderError ?? undefined}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        size="small"
                        variant="primary"
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                      >
                        <Trans>Create</Trans>
                      </Button>
                      <Button
                        size="small"
                        variant="subdued"
                        onClick={() => {
                          setShowNewFolderInput(false)
                          setNewFolderName("")
                          setNewFolderError(null)
                        }}
                      >
                        <Trans>Cancel</Trans>
                      </Button>
                    </Stack>
                  </Stack>
                </div>
              )}
            </div>
          </div>

          {/* Read-only target path preview */}
          <TextInput
            label={t`Target path`}
            value={targetPathDisplay}
            readOnly
            className="font-mono"
            helptext={t`The object will be moved to this path. Navigate folders above to change the destination.`}
          />

          {(copyMutation.isError || deleteMutation.isError) &&
            (() => {
              const copyErrorMessage = copyMutation.error?.message ?? ""
              const deleteErrorMessage = deleteMutation.error?.message ?? ""
              return (
                <Message variant="danger">
                  {copyMutation.isError ? (
                    <Trans>Failed to move object: {copyErrorMessage}</Trans>
                  ) : (
                    <Trans>Object was copied but could not be deleted from the source: {deleteErrorMessage}</Trans>
                  )}
                </Message>
              )
            })()}
        </Stack>
      )}
    </Modal>
  )
}

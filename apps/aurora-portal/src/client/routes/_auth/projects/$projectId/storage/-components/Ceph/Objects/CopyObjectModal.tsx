import { useState, useRef, useEffect, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
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
import { MdFolder, MdDescription, MdCreateNewFolder, MdArrowBack } from "react-icons/md"
import { useVirtualizer } from "@tanstack/react-virtual"

const MAX_COMBO_OPTIONS = 50

interface CopyObjectModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  objectSize?: number
  onClose: () => void
  onSuccess?: (objectKey: string, targetBucket: string, targetKey: string) => void
  onError?: (objectKey: string, errorMessage: string) => void
}

interface FolderRow {
  kind: "folder"
  name: string
  displayName: string
}

interface ObjectRow {
  kind: "object"
  name: string
  displayName: string
}

type BrowserRow = FolderRow | ObjectRow

export const CopyObjectModal = ({
  isOpen,
  bucketName,
  objectKey,
  objectSize,
  onClose,
  onSuccess,
  onError,
}: CopyObjectModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const submittedKeyRef = useRef("")

  // ── State ─────────────────────────────────────────────────────────────────
  const [targetBucket, setTargetBucket] = useState(bucketName)
  const [currentPrefix, setCurrentPrefix] = useState("")
  // Locally created folders — keyed by bucket, stored as full prefix paths.
  const [localFolders, setLocalFolders] = useState<Record<string, string[]>>({})
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderError, setNewFolderError] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [copyMetadata, setCopyMetadata] = useState(true)
  const [bucketSearch, setBucketSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Clear pending debounce timer on unmount
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    },
    []
  )

  // Reset browser state when modal opens or target bucket changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPrefix("")
      setLocalFolders((prev) => {
        const next = { ...prev }
        delete next[targetBucket]
        return next
      })
      setNewFolderName("")
      setNewFolderError(null)
      setShowNewFolderInput(false)
      setBucketSearch("")
      setDebouncedSearch("")
    }
  }, [isOpen, targetBucket])

  useEffect(() => {
    if (!isOpen) {
      setTargetBucket(bucketName)
      setCurrentPrefix("")
      setLocalFolders({})
      setNewFolderName("")
      setNewFolderError(null)
      setShowNewFolderInput(false)
      setBucketSearch("")
      setDebouncedSearch("")
    }
  }, [isOpen, bucketName])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: buckets, isLoading: isLoadingBuckets } = trpcReact.storage.ceph.containers.list.useQuery(
    { project_id: projectId ?? "", includeMetadata: false },
    { enabled: isOpen && !!projectId }
  )

  const { data: objectsData, isLoading: isLoadingObjects } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: targetBucket,
      prefix: currentPrefix || undefined,
      delimiter: "/",
      maxKeys: 1000,
    },
    { enabled: isOpen && !!targetBucket && !!projectId }
  )

  // ── Build rows from S3 response ───────────────────────────────────────────

  const buildRows = (): BrowserRow[] => {
    if (!objectsData) return []

    const folders: FolderRow[] = objectsData.folders.map((folder) => ({
      kind: "folder" as const,
      name: folder.prefix,
      displayName: currentPrefix ? folder.prefix.replace(currentPrefix, "").replace(/\/$/, "") : folder.prefix.replace(/\/$/, ""),
    }))

    const objects: ObjectRow[] = objectsData.objects
      .filter((obj) => {
        const stripped = currentPrefix ? obj.key.replace(currentPrefix, "") : obj.key
        return stripped !== "" && stripped !== "/"
      })
      .map((obj) => ({
        kind: "object" as const,
        name: obj.key,
        displayName: currentPrefix ? obj.key.replace(currentPrefix, "") : obj.key,
      }))

    return [...folders, ...objects]
  }

  // ── Rows: merge server data with locally created folders ──────────────────

  const serverRows = buildRows()
  const bucketLocalFolders = localFolders[targetBucket] ?? []
  const localFolderRows: BrowserRow[] = bucketLocalFolders
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

  const filteredBuckets =
    debouncedSearch.trim().length > 0
      ? (buckets ?? []).filter((b) => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : []

  const visibleBuckets = filteredBuckets.slice(0, MAX_COMBO_OPTIONS)
  const hiddenCount = filteredBuckets.length - visibleBuckets.length

  // ── Copy mutation ─────────────────────────────────────────────────────────

  const copyMutation = trpcReact.storage.ceph.objects.copy.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.list.invalidate()
      const targetKey = `${currentPrefix}${displayName}`
      onSuccess?.(submittedKeyRef.current, targetBucket, targetKey)
      handleClose()
    },
    onError: (error: { message: string }) => {
      onError?.(submittedKeyRef.current, error.message)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    copyMutation.reset()
    onClose()
  }

  const handleBucketSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBucketSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const handleBucketChange = (value?: string | number | string[] | undefined) => {
    const v = Array.isArray(value) ? value[0] : typeof value === "number" ? String(value) : value
    if (v) {
      setTargetBucket(v)
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

  const handleCreateFolder = () => {
    if (!validateNewFolderName(newFolderName)) return
    const trimmed = newFolderName.trim()
    const newPath = `${currentPrefix}${trimmed}/`
    setLocalFolders((prev) => ({
      ...prev,
      [targetBucket]: [...(prev[targetBucket] ?? []), newPath],
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

  const handleCopy = () => {
    if (!projectId) return
    submittedKeyRef.current = objectKey
    const targetKey = `${currentPrefix}${displayName}`
    copyMutation.mutate({
      project_id: projectId,
      sourceBucket: bucketName,
      sourceKey: objectKey,
      destinationBucket: targetBucket,
      destinationKey: targetKey,
      copyMetadata,
    })
  }

  // ── Virtualized folder browser ─────────────────────────────────────────────

  const folderRows = rows.filter((r) => r.kind === "folder")
  const objectRows = rows.filter((r) => r.kind === "object")
  const allBrowserRows = [...folderRows, ...objectRows]

  const rowVirtualizer = useVirtualizer({
    count: allBrowserRows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32,
    overscan: 5,
  })

  if (!isOpen) return null

  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const isPending = copyMutation.isPending
  const isLoading = isLoadingObjects

  // ── Read-only target path field value ─────────────────────────────────────
  const targetPathDisplay = `${targetBucket}/${currentPrefix}${displayName}`

  // Extract initial prefix from source object key
  const initialPrefix = objectKey.endsWith(displayName)
    ? objectKey.slice(0, objectKey.length - displayName.length)
    : ""

  // Disable submit when destination is identical to source
  const isUnchanged = targetBucket === bucketName && currentPrefix === initialPrefix

  return (
    <Modal
      title={
        <span className="flex max-w-[500px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Copy object:</Trans>
          </span>
          <span className="truncate font-mono" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Copying...` : t`Copy`}
      onConfirm={handleCopy}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isPending || isLoadingBuckets || isUnchanged}
    >
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Copying object...</Trans>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          {/* Source object info */}
          <div className="bg-theme-background-lvl-2 rounded p-3">
            <div className="text-sm text-theme-light">
              <Trans>Source:</Trans>
            </div>
            <div className="font-mono text-sm mt-1">{`${bucketName}/${objectKey}`}</div>
            {objectSize !== undefined && (
              <div className="text-xs text-theme-light mt-1">
                {(objectSize / 1024).toFixed(2)} KB
              </div>
            )}
          </div>

          {/* Target bucket — ComboBox with debounced search */}
          <ComboBox
            label={t`Target bucket`}
            value={targetBucket}
            onChange={handleBucketChange}
            onInputChange={handleBucketSearch}
            placeholder={t`Type to search buckets...`}
            helptext={(() => {
              if (isLoadingBuckets) return t`Loading buckets...`
              if (bucketSearch.trim().length === 0) return t`Start typing to search for a bucket`
              if (hiddenCount > 0) {
                const maxOptions = MAX_COMBO_OPTIONS
                const totalCount = filteredBuckets.length
                return t`Showing first ${maxOptions} of ${totalCount} — refine your search to narrow results`
              }
              return undefined
            })()}
            disabled={isLoadingBuckets || isPending}
            required
          >
            {visibleBuckets.map((b) => (
              <ComboBoxOption key={b.name} value={b.name}>
                {b.name}
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

          {/* Read-only target path */}
          <TextInput
            label={t`Target path`}
            value={targetPathDisplay}
            readOnly
            className="font-mono"
            helptext={t`The object will be copied to this path. Navigate folders above to change the destination.`}
          />

          {/* Copy metadata checkbox */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={copyMetadata}
              onChange={(e) => setCopyMetadata(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">
              <Trans>Copy metadata</Trans>
            </span>
          </label>

          {copyMutation.isError &&
            (() => {
              const errorMessage = copyMutation.error.message
              return (
                <Message variant="danger">
                  <Trans>Failed to copy object: {errorMessage}</Trans>
                </Message>
              )
            })()}
        </Stack>
      )}
    </Modal>
  )
}

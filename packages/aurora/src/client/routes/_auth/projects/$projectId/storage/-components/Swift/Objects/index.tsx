import { useState, useEffect, useRef, startTransition } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  Checkbox,
  DataGridToolbar,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  SearchInput,
  Spinner,
  Stack,
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { ObjectSummary } from "@/server/Storage/types/swift"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "../../../$provider/containers/$containerName/objects"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { UploadObjectModal } from "./UploadObjectModal"
import { DeleteObjectsModal } from "./DeleteObjectsModal"
import {
  getFolderCreatedToast,
  getFolderCreateErrorToast,
  getFolderDeletedToast,
  getFolderDeleteErrorToast,
  getObjectDownloadErrorToast,
  getObjectDeletedToast,
  getObjectDeleteErrorToast,
  getObjectCopiedToast,
  getObjectCopyErrorToast,
  getObjectMovedToast,
  getObjectMoveErrorToast,
  getTempUrlCopiedToast,
  getObjectMetadataUpdatedToast,
  getObjectMetadataUpdateErrorToast,
  getObjectUploadedToast,
  getObjectUploadCancelledToast,
  getObjectUploadErrorToast,
  getObjectsBulkDeletedToast,
  getObjectsBulkDeleteErrorToast,
} from "./ObjectToastNotifications"

// ── Prefix helpers ────────────────────────────────────────────────────────────

const encodePrefix = (prefix: string): string => {
  const bytes = new TextEncoder().encode(prefix)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("")
  return btoa(binString)
}

const decodePrefix = (encoded: string | undefined): string => {
  if (!encoded) return ""
  try {
    const binString = atob(encoded)
    const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!)
    return new TextDecoder().decode(bytes)
  } catch {
    return ""
  }
}

// ── Row types ─────────────────────────────────────────────────────────────────

export interface FolderRow {
  kind: "folder"
  name: string
  displayName: string
}

export interface ObjectRow {
  kind: "object"
  name: string
  displayName: string
  bytes: number
  last_modified: string | undefined
  content_type: string | undefined
}

export type BrowserRow = FolderRow | ObjectRow

// ── Build folder + object rows from a flat Swift listing ──────────────────────

export function buildRows(objects: ObjectSummary[], prefix: string): BrowserRow[] {
  const folders: FolderRow[] = []
  const files: ObjectRow[] = []
  const seenFolders = new Set<string>()

  for (const obj of objects) {
    const stripped = obj.name.startsWith(prefix) ? obj.name.slice(prefix.length) : obj.name
    if (stripped === "" || stripped === "/") continue
    const slashIdx = stripped.indexOf("/")
    if (slashIdx > 0) {
      const folderPrefix = prefix + stripped.slice(0, slashIdx + 1)
      if (!seenFolders.has(folderPrefix)) {
        seenFolders.add(folderPrefix)
        folders.push({ kind: "folder", name: folderPrefix, displayName: stripped.slice(0, slashIdx) })
      }
      continue
    }
    if (
      (obj.content_type === "application/directory" || obj.name.endsWith("/")) &&
      (slashIdx === -1 || slashIdx === stripped.length - 1)
    ) {
      const folderPrefix = obj.name.endsWith("/") ? obj.name : obj.name + "/"
      if (!seenFolders.has(folderPrefix)) {
        seenFolders.add(folderPrefix)
        folders.push({ kind: "folder", name: folderPrefix, displayName: stripped.replace(/\/$/, "") })
      }
      continue
    }
    files.push({
      kind: "object",
      name: obj.name,
      displayName: stripped,
      bytes: obj.bytes,
      last_modified: obj.last_modified,
      content_type: obj.content_type,
    })
  }

  return [...folders, ...files]
}

// ── Sort key allowlist ────────────────────────────────────────────────────────

type SortKey = "name" | "last_modified" | "bytes"
const ALLOWED_SORT_KEYS: SortKey[] = ["name", "last_modified", "bytes"]

const resolveSortBy = (sortBy: SortSettings["sortBy"]): SortKey | undefined => {
  if (typeof sortBy === "string") return ALLOWED_SORT_KEYS.includes(sortBy as SortKey) ? (sortBy as SortKey) : undefined
  if (typeof sortBy === "number") return ALLOWED_SORT_KEYS[sortBy]
  if (Array.isArray(sortBy)) {
    const first = sortBy[0]
    return typeof first === "string" && ALLOWED_SORT_KEYS.includes(first as SortKey) ? (first as SortKey) : undefined
  }
  return undefined
}

// ── SwiftObjects ──────────────────────────────────────────────────────────────

export const SwiftObjects = ({ provider, containerName }: { provider: string; containerName: string }) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  // Whether the list exposes any bulk action — drives the selection column in
  // ObjectsTableView and the Zone 3 bulk-action controls. Hardcoded to true for
  // now; the only bulk action today is the destructive Delete.
  //
  // TODO(perms): wire this to the real Swift object permission source
  // (e.g. a usePermissions hook or a tRPC permissions query) instead of
  // hardcoding it.
  const hasAnyBulkAction = true

  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])

  // Clear selection when prefix changes via browser back/forward or deep link,
  // since navigateToPrefix only clears it for in-app folder navigation
  useEffect(() => {
    setSelectedObjects([])
  }, [currentPrefix])
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  // Local mirror of the committed search term so typing stays responsive while
  // the URL commit is debounced (see Zone 2 SearchInput below).
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParam)
  const debounceTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  // Keep the input in sync when the committed search term changes from outside
  // the input — browser back/forward, deep links, or programmatic navigation —
  // so the field never drifts from the URL-backed filter state. When the change
  // originated from our own debounced commit, searchParam already equals
  // localSearchTerm, so this is a no-op and won't disturb the caret.
  useEffect(() => {
    setLocalSearchTerm(searchParam)
  }, [searchParam])

  const handleToastDismiss = () => setToastData(null)

  const handleCreateFolderSuccess = (folderName: string) =>
    setToastData(getFolderCreatedToast(folderName, { onDismiss: handleToastDismiss }))
  const handleCreateFolderError = (folderName: string, errorMessage: string) =>
    setToastData(getFolderCreateErrorToast(folderName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleUploadSuccess = (objectName: string) =>
    setToastData(getObjectUploadedToast(objectName, { onDismiss: handleToastDismiss }))
  const handleUploadCancelled = (objectName: string) =>
    setToastData(getObjectUploadCancelledToast(objectName, { onDismiss: handleToastDismiss }))
  const handleUploadError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectUploadErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleDeleteFolderSuccess = (folderName: string, deletedCount: number) => {
    const nestedCount = Math.max(0, deletedCount - 1)
    setToastData(getFolderDeletedToast(folderName, nestedCount, { onDismiss: handleToastDismiss }))
  }
  const handleDeleteFolderError = (folderName: string, errorMessage: string) =>
    setToastData(getFolderDeleteErrorToast(folderName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleDownloadError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectDownloadErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleDeleteObjectSuccess = (objectName: string) => {
    setSelectedObjects((prev) => prev.filter((name) => name !== objectName))
    setToastData(getObjectDeletedToast(objectName, { onDismiss: handleToastDismiss }))
  }
  const handleDeleteObjectError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectDeleteErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleCopyObjectSuccess = (objectName: string, targetContainer: string, targetPath: string) =>
    setToastData(getObjectCopiedToast(objectName, targetContainer, targetPath, { onDismiss: handleToastDismiss }))
  const handleCopyObjectError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectCopyErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleMoveObjectSuccess = (objectName: string, targetContainer: string, targetPath: string) => {
    setSelectedObjects((prev) => prev.filter((name) => name !== objectName))
    setToastData(getObjectMovedToast(objectName, targetContainer, targetPath, { onDismiss: handleToastDismiss }))
  }
  const handleMoveObjectError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectMoveErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
  const handleTempUrlCopySuccess = (objectName: string) =>
    setToastData(getTempUrlCopiedToast(objectName, { onDismiss: handleToastDismiss }))
  const handleEditMetadataSuccess = (objectName: string) =>
    setToastData(getObjectMetadataUpdatedToast(objectName, { onDismiss: handleToastDismiss }))
  const handleEditMetadataError = (objectName: string, errorMessage: string) =>
    setToastData(getObjectMetadataUpdateErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))

  const handleBulkDeleteSuccess = (numberDeleted: number) => {
    setSelectedObjects([])
    setToastData(getObjectsBulkDeletedToast(numberDeleted, { onDismiss: handleToastDismiss }))
  }

  const handleBulkDeleteError = (errorMessage: string, deletedKeys: string[]) => {
    if (deletedKeys.length > 0) {
      setSelectedObjects((prev) => prev.filter((key) => !deletedKeys.includes(key)))
    }
    setToastData(getObjectsBulkDeleteErrorToast(errorMessage, { onDismiss: handleToastDismiss }))
  }

  const sortSettings: SortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Last Modified`, value: "last_modified" },
      { label: t`Size`, value: "bytes" },
    ],
    sortBy: sortBy ?? undefined,
    sortDirection: sortDirection ?? "asc",
  }

  const {
    data: objects,
    isLoading,
    error,
  } = trpcReact.storage.swift.listObjects.useQuery({
    project_id: projectId,
    container: containerName,
    format: "json",
    prefix: currentPrefix || undefined,
  })

  const navigateToContainers = () => {
    navigate({
      to: "/projects/$projectId/storage/$provider/containers",
      params: { projectId, provider },
    })
  }

  const navigateToPrefix = (newPrefix: string) => {
    // Reset selection when navigating into a different prefix level
    setSelectedObjects([])
    navigate({ search: (prev) => ({ ...prev, prefix: encodePrefix(newPrefix) }) })
  }

  const allRows = buildRows((objects ?? []) as ObjectSummary[], currentPrefix)
  const filteredRows = allRows.filter((row) => row.displayName.toLowerCase().includes(searchParam.toLowerCase().trim()))
  const totalItemCount = allRows.length
  const filteredItemCount = filteredRows.length
  const sortedRows = !sortBy
    ? filteredRows
    : [...filteredRows].sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case "name":
            comparison = a.displayName.localeCompare(b.displayName)
            break
          case "last_modified": {
            const aDate = a.kind === "object" ? a.last_modified : undefined
            const bDate = b.kind === "object" ? b.last_modified : undefined
            if (!aDate || !bDate) break
            comparison = new Date(aDate).getTime() - new Date(bDate).getTime()
            break
          }
          case "bytes": {
            const aBytes = a.kind === "object" ? a.bytes : 0
            const bBytes = b.kind === "object" ? b.bytes : 0
            comparison = aBytes - bBytes
            break
          }
        }
        return (sortDirection ?? "asc") === "desc" ? -comparison : comparison
      })

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({ search: (prev) => ({ ...prev, search: value || undefined }) })
    })
  }

  const handleSortChange = (newSort: SortSettings) => {
    const resolvedSortBy = resolveSortBy(newSort.sortBy)
    const resolvedDirection = (newSort.sortDirection as "asc" | "desc") || "asc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: resolvedSortBy,
          sortDirection: resolvedSortBy ? resolvedDirection : undefined,
        }),
      })
    })
  }

  if (isLoading) {
    return (
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Objects...</Trans>
      </Stack>
    )
  }

  if (error) {
    const errorMessage = error.message
    return (
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error Loading Objects: {errorMessage}</Trans>
      </Stack>
    )
  }

  const hasSelection = selectedObjects.length > 0
  const selectedCount = selectedObjects.length

  // Derive short display names for the modal list — selectedObjects holds full
  // keys (e.g. "folder/sub/file.txt") but the modal should show "file.txt".
  const selectedDisplayNames = selectedObjects.map((key) => sortedRows.find((r) => r.name === key)?.displayName ?? key)

  // Zone 3 select-all operates on the selectable (object, non-folder) rows in
  // the currently displayed (filtered + sorted) set.
  const selectableNames = sortedRows.filter((r): r is ObjectRow => r.kind === "object").map((r) => r.name)
  const allSelectableSelected = selectableNames.length > 0 && selectableNames.every((n) => selectedObjects.includes(n))
  const someSelectableSelected = selectableNames.some((n) => selectedObjects.includes(n))

  const handleToggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedObjects((prev) => prev.filter((n) => !selectableNames.includes(n)))
    } else {
      setSelectedObjects((prev) => [...new Set([...prev, ...selectableNames])])
    }
  }

  return (
    <div className="relative">
      <ObjectsFileNavigation
        containerName={containerName}
        currentPrefix={currentPrefix}
        onContainersClick={navigateToContainers}
        onPrefixClick={navigateToPrefix}
      />
      <Stack direction="vertical">
        {/* Zone 1 — sort controls + primary actions (plain Stack, no background) */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <Stack gap="0.5" alignment="center">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              onSortByChange={(v) =>
                handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
              }
              onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
            />
          </Stack>
          <Button variant="primary" className="whitespace-nowrap" onClick={() => setCreateFolderModalOpen(true)}>
            <Trans>Create Folder</Trans>
          </Button>
          <Button className="whitespace-nowrap" onClick={() => setUploadModalOpen(true)}>
            <Trans>Upload Object</Trans>
          </Button>
        </Stack>

        {/* Zone 2 — debounced search. DataGridToolbar provides the background. */}
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder={t`Search objects...`}
                data-testid="searchbar"
                value={localSearchTerm}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const v = e.currentTarget.value
                  setLocalSearchTerm(v)
                  clearTimeout(debounceTimer.current)
                  debounceTimer.current = window.setTimeout(() => handleSearchChange(v), 500)
                }}
                onSearch={(v) => {
                  clearTimeout(debounceTimer.current)
                  handleSearchChange(typeof v === "string" ? v : "")
                }}
                onClear={() => {
                  clearTimeout(debounceTimer.current)
                  setLocalSearchTerm("")
                  handleSearchChange("")
                }}
              />
            </Stack>
          </Stack>
        </DataGridToolbar>

        {/* Zone 3 — bulk actions (gated) plus the item count. */}
        <DataGridToolbar>
          <Stack distribution="start" gap="2" alignment="center" className="text-sm">
            {hasAnyBulkAction ? (
              <Stack gap="2" alignment="center">
                <Checkbox
                  checked={allSelectableSelected}
                  indeterminate={someSelectableSelected && !allSelectableSelected}
                  onChange={handleToggleSelectAll}
                />
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button disabled={!hasSelection} size="small" icon="moreVert" label={t`Actions`} />
                  </PopupMenuToggle>
                  {hasSelection && (
                    <PopupMenuOptions>
                      <PopupMenuItem
                        disabled={!hasSelection}
                        label={selectedCount > 1 ? t`Delete Objects` : t`Delete Object`}
                        onClick={() => setDeleteAllModalOpen(true)}
                      />
                    </PopupMenuOptions>
                  )}
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}

            <div className="text-theme-light flex items-center gap-1" data-testid="objects-info-block">
              {searchParam.trim() ? (
                <Plural
                  value={totalItemCount}
                  one={`${filteredItemCount} of ${totalItemCount} item`}
                  other={`${filteredItemCount} of ${totalItemCount} items`}
                />
              ) : (
                <Plural value={totalItemCount} one={`${totalItemCount} item`} other={`${totalItemCount} items`} />
              )}
            </div>
          </Stack>
        </DataGridToolbar>
      </Stack>
      <ObjectsTableView
        rows={sortedRows}
        searchTerm={searchParam}
        container={containerName}
        onFolderClick={navigateToPrefix}
        onDeleteFolderSuccess={handleDeleteFolderSuccess}
        onDeleteFolderError={handleDeleteFolderError}
        onDownloadError={handleDownloadError}
        onDeleteObjectSuccess={handleDeleteObjectSuccess}
        onDeleteObjectError={handleDeleteObjectError}
        onCopyObjectSuccess={handleCopyObjectSuccess}
        onCopyObjectError={handleCopyObjectError}
        onMoveObjectSuccess={handleMoveObjectSuccess}
        onMoveObjectError={handleMoveObjectError}
        onTempUrlCopySuccess={handleTempUrlCopySuccess}
        onEditMetadataSuccess={handleEditMetadataSuccess}
        onEditMetadataError={handleEditMetadataError}
        selectedObjects={selectedObjects}
        setSelectedObjects={setSelectedObjects}
        hasAnyBulkAction={hasAnyBulkAction}
      />

      <DeleteObjectsModal
        isOpen={deleteAllModalOpen}
        objectNames={selectedDisplayNames}
        objectKeys={selectedObjects}
        container={containerName}
        onClose={() => setDeleteAllModalOpen(false)}
        onSuccess={handleBulkDeleteSuccess}
        onError={handleBulkDeleteError}
      />

      <CreateFolderModal
        isOpen={createFolderModalOpen}
        currentPrefix={currentPrefix}
        onClose={() => setCreateFolderModalOpen(false)}
        onSuccess={handleCreateFolderSuccess}
        onError={handleCreateFolderError}
      />

      <UploadObjectModal
        projectId={projectId}
        isOpen={uploadModalOpen}
        currentPrefix={currentPrefix}
        container={containerName}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        onCancelled={handleUploadCancelled}
        onError={handleUploadError}
      />

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </div>
  )
}

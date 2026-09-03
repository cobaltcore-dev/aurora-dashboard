import { useState, useEffect, useRef, startTransition } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import {
  Button,
  Checkbox,
  DataGridToolbar,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  SearchInput,
  Status,
  Stack,
  toast,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { ObjectSummary } from "@/server/Storage/types/swift"
import { parseSwiftDate } from "@/client/utils/formatSwiftDate"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "../../../$provider/$storageType/$containerName/objects"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { UploadObjectModal } from "./UploadObjectModal"
import { DeleteObjectsModal } from "./DeleteObjectsModal"
import {
  getContainerAccessErrorToast,
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
  const { t, i18n } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()
  const { storageType } = Route.useParams()
  const currentPrefix = decodePrefix(encodedPrefix)

  // Whether the list exposes any bulk action — drives the selection column in
  // ObjectsTableView and the Zone 4 bulk-action controls. Hardcoded to true for
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

  const handleCreateFolderSuccess = (folderName: string) => {
    const { message, ...options } = getFolderCreatedToast(folderName)
    toast.success(message, options)
  }
  const handleCreateFolderError = (folderName: string, errorMessage: string) => {
    const { message, ...options } = getFolderCreateErrorToast(folderName, errorMessage)
    toast.error(message, options)
  }
  const handleUploadSuccess = (objectName: string) => {
    const { message, ...options } = getObjectUploadedToast(objectName)
    toast.success(message, options)
  }
  const handleUploadCancelled = (objectName: string) => {
    const { message, ...options } = getObjectUploadCancelledToast(objectName)
    toast.warning(message, options)
  }
  const handleUploadError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectUploadErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }
  const handleDeleteFolderSuccess = (folderName: string, deletedCount: number) => {
    const nestedCount = Math.max(0, deletedCount - 1)
    const { message, ...options } = getFolderDeletedToast(folderName, nestedCount)
    toast.success(message, options)
  }
  const handleDeleteFolderError = (folderName: string, errorMessage: string) => {
    const { message, ...options } = getFolderDeleteErrorToast(folderName, errorMessage)
    toast.error(message, options)
  }
  const handleDownloadError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectDownloadErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }
  const handleDeleteObjectSuccess = (objectName: string) => {
    setSelectedObjects((prev) => prev.filter((name) => name !== objectName))
    const { message, ...options } = getObjectDeletedToast(objectName)
    toast.success(message, options)
  }
  const handleDeleteObjectError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectDeleteErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }
  const handleCopyObjectSuccess = (objectName: string, targetContainer: string, targetPath: string) => {
    const { message, ...options } = getObjectCopiedToast(objectName, targetContainer, targetPath)
    toast.success(message, options)
  }
  const handleCopyObjectError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectCopyErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }
  const handleMoveObjectSuccess = (objectName: string, targetContainer: string, targetPath: string) => {
    setSelectedObjects((prev) => prev.filter((name) => name !== objectName))
    const { message, ...options } = getObjectMovedToast(objectName, targetContainer, targetPath)
    toast.success(message, options)
  }
  const handleMoveObjectError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectMoveErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }
  const handleTempUrlCopySuccess = (objectName: string) => {
    const { message, ...options } = getTempUrlCopiedToast(objectName)
    toast.success(message, options)
  }
  const handleEditMetadataSuccess = (objectName: string) => {
    const { message, ...options } = getObjectMetadataUpdatedToast(objectName)
    toast.success(message, options)
  }
  const handleEditMetadataError = (objectName: string, errorMessage: string) => {
    const { message, ...options } = getObjectMetadataUpdateErrorToast(objectName, errorMessage)
    toast.error(message, options)
  }

  const handleBulkDeleteSuccess = (numberDeleted: number) => {
    setSelectedObjects([])
    const { message, ...options } = getObjectsBulkDeletedToast(numberDeleted)
    toast.success(message, options)
  }

  const handleBulkDeleteError = (errorMessage: string, deletedKeys: string[]) => {
    if (deletedKeys.length > 0) {
      setSelectedObjects((prev) => prev.filter((key) => !deletedKeys.includes(key)))
    }
    const { message, ...options } = getObjectsBulkDeleteErrorToast(errorMessage)
    toast.error(message, options)
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
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId, provider, storageType },
    })
  }

  // #1142: don't render the object browser for a container we can't read.
  // A failed listing means the container doesn't exist or the user has no
  // access to it — surface a single friendly toast (no technical error, no
  // not-found/forbidden distinction that would leak existence) and redirect
  // back to the container list. Redirect + toast are side effects, so they run
  // in an effect rather than during render.
  //
  // navigate (and the params it captures) are recreated each render, so they're
  // listed as deps honestly; a ref guards against firing the toast/redirect more
  // than once per error — it runs once when an error appears and resets when the
  // error clears.
  const redirectedRef = useRef(false)
  useEffect(() => {
    if (!error) {
      redirectedRef.current = false
      return
    }
    if (redirectedRef.current) return
    redirectedRef.current = true
    const { message, ...options } = getContainerAccessErrorToast(containerName)
    toast.error(message, options)
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId, provider, storageType },
    })
  }, [error, containerName, navigate, projectId, provider, storageType])

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
            // #1236: Swift listing timestamps are UTC without a "Z" — parse them
            // as UTC so the ordering is correct (matters near DST boundaries).
            comparison = (parseSwiftDate(aDate)?.getTime() ?? 0) - (parseSwiftDate(bDate)?.getTime() ?? 0)
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
    return <Status status="progress" title={t`Loading Objects...`} />
  }

  // #1142: on load error we don't render the technical message anymore. The
  // effect above shows a toast and redirects to the container list; render
  // nothing while that happens (also covers the brief tick before navigation).
  if (error) {
    return null
  }

  const hasSelection = selectedObjects.length > 0
  const selectedCount = selectedObjects.length

  // Derive short display names for the modal list — selectedObjects holds full
  // keys (e.g. "folder/sub/file.txt") but the modal should show "file.txt".
  const selectedDisplayNames = selectedObjects.map((key) => sortedRows.find((r) => r.name === key)?.displayName ?? key)

  // Zone 4 select-all operates on the selectable (object, non-folder) rows in
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
      <Stack direction="vertical">
        {/* Zone 1 — sort controls + primary actions (plain Stack, no background) */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <Stack gap="0.5" alignment="center">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              selectClassName="min-w-40"
              onSortByChange={(v) =>
                handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
              }
              onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
            />
          </Stack>
          <Stack gap="0.5" alignment="center">
            <PopupMenu className="flex items-center">
              <PopupMenuToggle as="div">
                <Button icon="moreVert" title={t`More Actions`} />
              </PopupMenuToggle>
              <PopupMenuOptions>
                <PopupMenuItem
                  label={t`Create Folder`}
                  onClick={() => setCreateFolderModalOpen(true)}
                  data-testid="create-folder-action"
                />
              </PopupMenuOptions>
            </PopupMenu>
            <Button variant="primary" className="whitespace-nowrap" onClick={() => setUploadModalOpen(true)}>
              <Trans>Upload Object</Trans>
            </Button>
          </Stack>
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

        {/* Zone 3 — breadcrumb navigation in its own row (matches Ceph). */}
        <DataGridToolbar>
          <ObjectsFileNavigation
            containerName={containerName}
            currentPrefix={currentPrefix}
            onContainersClick={navigateToContainers}
            onPrefixClick={navigateToPrefix}
          />
        </DataGridToolbar>

        {/* Zone 4 — bulk actions (gated) plus the item count. Bulk actions sit
            on the left; the count is pushed right via ml-auto so it stays
            right-aligned regardless of whether the bulk block renders. */}
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
                        label={i18n._(
                          plural(selectedCount, {
                            one: "Delete # Object",
                            other: "Delete # Objects",
                          })
                        )}
                        onClick={() => setDeleteAllModalOpen(true)}
                      />
                    </PopupMenuOptions>
                  )}
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}

            <div className="text-theme-light ml-auto flex items-center gap-1" data-testid="objects-info-block">
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
    </div>
  )
}

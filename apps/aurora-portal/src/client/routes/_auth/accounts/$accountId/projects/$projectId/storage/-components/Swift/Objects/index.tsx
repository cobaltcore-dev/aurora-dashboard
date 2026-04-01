import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Spinner, Button, Toast, ToastProps, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { ObjectSummary } from "@/server/Storage/types/swift"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Route } from "../../../$provider/containers/$containerName/objects"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import {
  getFolderCreatedToast,
  getFolderCreateErrorToast,
  getFolderDeletedToast,
  getFolderDeleteErrorToast,
  getObjectDownloadErrorToast,
} from "./ObjectToastNotifications"

// ── Prefix helpers ────────────────────────────────────────────────────────────

/** Encode a prefix string to a base64 search param value */
const encodePrefix = (prefix: string): string => {
  // Use TextEncoder for Unicode-safe base64 encoding
  const bytes = new TextEncoder().encode(prefix)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("")
  return btoa(binString)
}

/** Decode a base64 search param back to a prefix string */
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
  /** Full prefix key, e.g. "test/" */
  name: string
  /** Stripped + no trailing slash, e.g. "test" */
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

    // Skip the directory entry for the current prefix itself.
    // When listing with prefix="test/", Swift includes { name: "test/" } in the result.
    // After stripping the prefix, stripped === "" — this is the folder we are already
    // inside, so showing it would produce a nameless row.
    if (stripped === "" || stripped === "/") continue

    // Find the first "/" in the stripped name to determine folder vs file at this level.
    // slashIdx > 0 means there is a real folder segment before the slash.
    // slashIdx === 0 means the object name starts with "/" (e.g. "/Aurora_gold.png") —
    //   treat it as a plain file at the current level.
    const slashIdx = stripped.indexOf("/")

    if (slashIdx > 0) {
      // There is a folder segment before the slash — collapse into a pseudo-folder row.
      // This handles both explicit directory entries deeper than the current level
      // (e.g. "test3/1/" stripped → "test3/1/", slashIdx=5 → folderPrefix="test3/")
      // and plain objects in subdirectories (e.g. "test/file.txt" → "test/").
      const folderPrefix = prefix + stripped.slice(0, slashIdx + 1)
      if (!seenFolders.has(folderPrefix)) {
        seenFolders.add(folderPrefix)
        folders.push({
          kind: "folder",
          name: folderPrefix,
          displayName: stripped.slice(0, slashIdx),
        })
      }
      continue
    }

    // Explicit top-level directory entry: e.g. stripped === "somefolder/" (slashIdx at end only).
    // slashIdx is either -1 (no slash at all) or === stripped.length-1 (trailing slash, nothing after).
    if (
      (obj.content_type === "application/directory" || obj.name.endsWith("/")) &&
      (slashIdx === -1 || slashIdx === stripped.length - 1)
    ) {
      const folderPrefix = obj.name.endsWith("/") ? obj.name : obj.name + "/"
      if (!seenFolders.has(folderPrefix)) {
        seenFolders.add(folderPrefix)
        folders.push({
          kind: "folder",
          name: folderPrefix,
          displayName: stripped.replace(/\/$/, ""),
        })
      }
      continue
    }

    // Plain file at this level (slashIdx === -1, or leading slash treated as part of name)
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

// Safely resolve the sort key from whatever ListToolbar passes — it can be a
// string, number index, or array. Unknown values return undefined (unsorted).
const resolveSortBy = (sortBy: SortSettings["sortBy"]): SortKey | undefined => {
  if (typeof sortBy === "string") {
    return ALLOWED_SORT_KEYS.includes(sortBy as SortKey) ? (sortBy as SortKey) : undefined
  }
  if (typeof sortBy === "number") {
    return ALLOWED_SORT_KEYS[sortBy]
  }
  if (Array.isArray(sortBy)) {
    const first = sortBy[0]
    return typeof first === "string" && ALLOWED_SORT_KEYS.includes(first as SortKey) ? (first as SortKey) : undefined
  }
  return undefined
}

// ── SwiftObjects ──────────────────────────────────────────────────────────────

export const SwiftObjects = () => {
  const { t } = useLingui()
  const navigate = useNavigate({ from: Route.fullPath })

  const { accountId, projectId, provider, containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  // All UI state is persisted in the URL search params so that sort, prefix and
  // search survive navigation, browser back/forward, and deep links.
  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false)
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

  const handleCreateFolderSuccess = (folderName: string) => {
    setToastData(getFolderCreatedToast(folderName, { onDismiss: handleToastDismiss }))
  }

  const handleCreateFolderError = (folderName: string, errorMessage: string) => {
    setToastData(getFolderCreateErrorToast(folderName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteFolderSuccess = (folderName: string, deletedCount: number) => {
    // Swift counts the zero-byte folder placeholder itself as a deleted object,
    // so subtract 1 to report only the nested content to the user.
    const nestedCount = Math.max(0, deletedCount - 1)
    setToastData(getFolderDeletedToast(folderName, nestedCount, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteFolderError = (folderName: string, errorMessage: string) => {
    setToastData(getFolderDeleteErrorToast(folderName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleDownloadError = (objectName: string, errorMessage: string) => {
    setToastData(getObjectDownloadErrorToast(objectName, errorMessage, { onDismiss: handleToastDismiss }))
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
    container: containerName,
    format: "json",
    prefix: currentPrefix || undefined,
  })

  // ── Folder navigation via search param ───────────────────────────────────

  const navigateToContainers = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers",
      params: { accountId, projectId, provider },
    })
  }

  const navigateToPrefix = (newPrefix: string) => {
    navigate({
      search: (prev) => ({ ...prev, prefix: encodePrefix(newPrefix) }),
    })
  }

  // ── Sort + filter ─────────────────────────────────────────────────────────

  const allRows = buildRows((objects ?? []) as ObjectSummary[], currentPrefix)

  const filteredRows = allRows.filter((row) => row.displayName.toLowerCase().includes(searchParam.toLowerCase().trim()))

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({ ...prev, search: value || undefined }),
      })
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

  // Handle loading state
  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Objects...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (error) {
    const errorMessage = error.message
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error Loading Objects: {errorMessage}</Trans>
      </Stack>
    )
  }

  return (
    <div className="relative">
      <ObjectsFileNavigation
        containerName={containerName}
        currentPrefix={currentPrefix}
        onContainersClick={navigateToContainers}
        onPrefixClick={navigateToPrefix}
      />
      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchParam}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
        actions={
          <Button variant="primary" onClick={() => setCreateFolderModalOpen(true)}>
            <Trans>Create Folder</Trans>
          </Button>
        }
      />
      <ObjectsTableView
        rows={sortedRows}
        searchTerm={searchParam}
        container={containerName}
        onFolderClick={navigateToPrefix}
        onDeleteFolderSuccess={handleDeleteFolderSuccess}
        onDeleteFolderError={handleDeleteFolderError}
        onDownloadError={handleDownloadError}
      />

      <CreateFolderModal
        isOpen={createFolderModalOpen}
        currentPrefix={currentPrefix}
        onClose={() => setCreateFolderModalOpen(false)}
        onSuccess={handleCreateFolderSuccess}
        onError={handleCreateFolderError}
      />

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </div>
  )
}

import { useRef, useEffect, useState, startTransition } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Spinner,
  Stack,
  Icon,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { ObjectSummary } from "@/server/Storage/types/swift"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { Route } from "../../$provider/containers/$containerName/objects/$"

// ── Prefix helpers ────────────────────────────────────────────────────────────

/** Encode a prefix string to a base64 search param value */
const encodePrefix = (prefix: string): string => btoa(prefix)

/** Decode a base64 search param back to a prefix string */
const decodePrefix = (encoded: string | undefined): string => {
  if (!encoded) return ""
  try {
    return atob(encoded)
  } catch {
    return ""
  }
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface FolderRow {
  kind: "folder"
  /** Full prefix key, e.g. "test/" */
  name: string
  /** Stripped + no trailing slash, e.g. "test" */
  displayName: string
}

interface ObjectRow {
  kind: "object"
  name: string
  displayName: string
  bytes: number
  last_modified: string | undefined
  content_type: string | undefined
}

type BrowserRow = FolderRow | ObjectRow

// ── Build folder + object rows from a flat Swift listing ──────────────────────

function buildRows(objects: ObjectSummary[], prefix: string): BrowserRow[] {
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

// ── Breadcrumb helpers ────────────────────────────────────────────────────────

/**
 * Splits the current prefix into navigable breadcrumb segments.
 * e.g. "a/b/c/" → [{ label: "a", prefix: "a/" }, { label: "b", prefix: "a/b/" }, { label: "c", prefix: "a/b/c/" }]
 */
function prefixToSegments(prefix: string): { label: string; prefix: string }[] {
  if (!prefix) return []
  // Remove trailing slash before splitting so we don't get a trailing empty segment
  const parts = prefix.replace(/\/$/, "").split("/").filter(Boolean)
  return parts.map((label, i) => ({
    label,
    prefix: parts.slice(0, i + 1).join("/") + "/",
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SwiftObjects = () => {
  const { t } = useLingui()
  const navigate = useNavigate({ from: Route.fullPath })

  const { accountId, projectId, provider, containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
  })
  const { prefix: encodedPrefix } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  // Breadcrumb segments derived from the current prefix
  const prefixSegments = prefixToSegments(currentPrefix)

  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  const [sortSettings, setSortSettings] = useState<SortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Last Modified`, value: "last_modified" },
      { label: t`Size`, value: "bytes" },
    ],
    sortBy: undefined,
    sortDirection: "asc",
  })

  const [searchTerm, setSearchTerm] = useState("")

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

  const filteredRows = allRows.filter((row) => row.displayName.toLowerCase().includes(searchTerm.toLowerCase().trim()))

  const sortedRows = !sortSettings.sortBy
    ? filteredRows
    : [...filteredRows].sort((a, b) => {
        let comparison = 0
        switch (sortSettings.sortBy) {
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
        return sortSettings.sortDirection === "desc" ? -comparison : comparison
      })

  // ── Scrollbar width ───────────────────────────────────────────────────────

  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [sortedRows.length])

  // ── Virtualizer ───────────────────────────────────────────────────────────

  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => setSearchTerm(value))
  }

  const handleSortChange = (newSort: SortSettings) => {
    startTransition(() =>
      setSortSettings({
        options: newSort.options,
        sortBy: newSort.sortBy?.toString() || "name",
        sortDirection: newSort.sortDirection || "asc",
      })
    )
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return t`N/A`
    }
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Objects...</Trans>
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error Loading Objects: {error.message}</Trans>
      </Stack>
    )
  }

  // ── Column template: name | last modified | size ──────────────────────────
  const gridColumnTemplate = "minmax(200px, 3fr) minmax(180px, 2fr) minmax(100px, 1fr)"

  const totalCount = sortedRows.length
  const visibleCount = rowVirtualizer.getVirtualItems().length

  // ── Empty state ───────────────────────────────────────────────────────────

  if (sortedRows.length === 0) {
    return (
      <>
        <ObjectsBreadcrumb
          containerName={containerName}
          prefixSegments={prefixSegments}
          onContainersClick={navigateToContainers}
          onSegmentClick={(prefix) => navigateToPrefix(prefix)}
        />
        <ListToolbar
          sortSettings={sortSettings}
          searchTerm={searchTerm}
          onSort={handleSortChange}
          onSearch={handleSearchChange}
        />
        <DataGrid columns={3} className="objects" data-testid="no-objects">
          <DataGridRow>
            <DataGridCell colSpan={3}>
              <div className="py-8 text-center">
                <h3 className="text-lg font-semibold">
                  <Trans>No objects found</Trans>
                </h3>
                <p className="text-theme-light mt-2">
                  {searchTerm ? (
                    <Trans>No objects match your search. Try adjusting your search term.</Trans>
                  ) : (
                    <Trans>This folder is empty.</Trans>
                  )}
                </p>
              </div>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      </>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <ObjectsBreadcrumb
        containerName={containerName}
        prefixSegments={prefixSegments}
        onContainersClick={navigateToContainers}
        onSegmentClick={(prefix) => navigateToPrefix(prefix)}
      />
      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
      />

      <div className="relative">
        {/* Fixed header with scrollbar compensation */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={3}
            gridColumnTemplate={gridColumnTemplate}
            className="objects"
            data-testid="objects-table-header"
          >
            <DataGridRow>
              <DataGridHeadCell>
                <Trans>Object Name</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Last Modified</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }}>
                <Trans>Size</Trans>
              </DataGridHeadCell>
            </DataGridRow>
          </DataGrid>
        </div>

        {/* Virtualized body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: "calc(100vh - 485px)" }}
          data-testid="objects-table-body"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = sortedRows[virtualRow.index]
              const isFolder = row.kind === "folder"

              return (
                <div
                  key={row.name}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="juno-datagrid"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: gridColumnTemplate,
                    alignItems: "stretch",
                  }}
                  data-testid={`object-row-${row.name}`}
                >
                  {/* Name */}
                  <DataGridCell className="min-w-0 overflow-hidden">
                    {isFolder ? (
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 text-left hover:underline focus:outline-none"
                        onClick={() => navigateToPrefix(row.name)}
                        data-testid={`folder-${row.name}`}
                        title={row.displayName}
                      >
                        <Icon icon="autoAwesomeMosaic" size="18" className="text-theme-light shrink-0" />
                        <span className="truncate">{row.displayName}</span>
                      </button>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2" title={row.displayName}>
                        <Icon icon="description" size="18" className="text-theme-light shrink-0" />
                        <span className="truncate">{row.displayName}</span>
                      </span>
                    )}
                  </DataGridCell>

                  {/* Last Modified */}
                  <DataGridCell>{!isFolder && row.last_modified ? formatDate(row.last_modified) : "—"}</DataGridCell>

                  {/* Size */}
                  <DataGridCell>{!isFolder ? formatBytesBinary(row.bytes) : "—"}</DataGridCell>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-theme-light border-theme-background-lvl-2 border-t px-4 py-2 text-sm">
          <Trans>
            Showing {visibleCount} of {totalCount} items
          </Trans>
        </div>
      </div>
    </div>
  )
}

// ── ObjectsBreadcrumb ─────────────────────────────────────────────────────────

interface ObjectsBreadcrumbProps {
  containerName: string
  prefixSegments: { label: string; prefix: string }[]
  onContainersClick: () => void
  onSegmentClick: (prefix: string) => void
}

function ObjectsBreadcrumb({
  containerName,
  prefixSegments,
  onContainersClick,
  onSegmentClick,
}: ObjectsBreadcrumbProps) {
  const { t } = useLingui()

  // The last segment (deepest folder) is the active crumb — non-clickable.
  // All segments before it are clickable navigation targets.
  const isAtRoot = prefixSegments.length === 0

  return (
    <div className="mb-2 px-2 pt-2">
      <Breadcrumb>
        {/* "All containers" root — always navigates back to the container list */}
        <BreadcrumbItem onClick={onContainersClick} label={t`All containers`} icon="dns" />

        {/* Container name — active when at root prefix, clickable otherwise */}
        <BreadcrumbItem
          onClick={isAtRoot ? undefined : () => onSegmentClick("")}
          active={isAtRoot}
          label={containerName}
          icon="autoAwesomeMosaic"
        />

        {/* One crumb per prefix segment, last one is active */}
        {prefixSegments.map((seg, i) => {
          const isLast = i === prefixSegments.length - 1
          return (
            <BreadcrumbItem
              key={seg.prefix}
              onClick={isLast ? undefined : () => onSegmentClick(seg.prefix)}
              active={isLast}
              label={seg.label}
            />
          )
        })}
      </Breadcrumb>
    </div>
  )
}

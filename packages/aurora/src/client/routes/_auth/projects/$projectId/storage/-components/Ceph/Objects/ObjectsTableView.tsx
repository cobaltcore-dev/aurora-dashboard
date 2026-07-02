import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Badge,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { trpcClient, trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import type { S3Object, S3FolderPrefix, S3ObjectVersion } from "@/server/Storage/types/ceph"

// Extended version type for frontend use (includes isDeleted flag)
type S3ObjectVersionExtended = S3ObjectVersion & {
  isDeleted?: boolean // Flag for showing "Deleted" badge (file that can be restored)
}
import { DeleteObjectModal } from "./DeleteObjectModal"
import { RestoreVersionModal } from "./RestoreVersionModal"
import { CopyObjectModal } from "./CopyObjectModal"
import { MoveObjectModal } from "./MoveObjectModal"
import { EditMetadataModal } from "./EditMetadataModal"
import { ObjectVersionHistoryModal } from "./ObjectVersionHistoryModal"

// MIME types that are safe to preview in a browser tab. The decision to
// preview vs download is made from the Content-Type the BFF actually returns
// (resolved server-side from the object key when S3 stores a generic default),
// not from the filename — so it works for UUID-keyed objects too.
//
// NOTE: Intentionally exclude scriptable types (e.g. text/html, application/json,
// application/xml) and SVG (can execute scripts when opened via blob URLs).
const BROWSER_PREVIEWABLE_MIME_TYPES = new Set(["application/pdf", "text/plain"])

function isPreviewableContentType(contentType: string): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase()
  if (BROWSER_PREVIEWABLE_MIME_TYPES.has(base)) return true
  if (base === "image/svg+xml") return false
  return base.startsWith("image/") || base.startsWith("video/") || base.startsWith("audio/")
}

// One in-flight transfer for a given row: either a forced download (from the
// context menu) or a row-click preview-or-download. Keyed by row.key in a Map
// so multiple rows can transfer concurrently without clobbering each other.
type ActiveTransfer = { kind: "download" | "preview"; downloadId: string }

// Subscribes to live progress for a single in-flight transfer. Each active row
// renders its own instance of this component (keyed by downloadId), so
// concurrent transfers each get an independent subscription rather than
// sharing one — starting a second transfer never disrupts the first's progress.
function RowTransferProgress({
  projectId,
  downloadId,
  isPreviewing,
}: {
  projectId: string
  downloadId: string
  isPreviewing: boolean
}) {
  const { data: progress } = trpcReact.storage.ceph.objects.watchDownloadProgress.useSubscription(
    { project_id: projectId, downloadId },
    { enabled: !!downloadId }
  )
  const percent = progress?.percent

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-theme-light flex items-center gap-2 text-sm">
        <Spinner size="small" />
        {percent != null ? (
          <Trans>{percent}%</Trans>
        ) : isPreviewing ? (
          <Trans>Loading preview...</Trans>
        ) : (
          <Trans>Downloading...</Trans>
        )}
      </span>
      {percent != null && (
        <div className="bg-theme-background-lvl-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-theme-accent h-1 rounded-full transition-all duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </span>
  )
}

type FolderRow = { kind: "folder"; prefix: string; displayName: string }
type ObjectRow = {
  kind: "object"
  key: string
  size: number
  lastModified: string | undefined
  displayName: string
}
type VersionRow = {
  kind: "version"
  key: string
  versionId: string
  isLatest: boolean
  isDeleteMarker: boolean
  isDeleted?: boolean // Flag for showing "Deleted" badge (file that can be restored)
  size: number
  lastModified: string | undefined
  displayName: string
}
type CephRow = FolderRow | ObjectRow | VersionRow

// Define column template — 4 columns: name | size | last modified | actions
const GRID_COLUMN_TEMPLATE = "minmax(200px, 3fr) minmax(100px, 1fr) minmax(180px, 2fr) 60px"

interface ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: S3FolderPrefix[]
  versions?: S3ObjectVersionExtended[] // When showing all versions (extended with isDeleted flag)
  currentPrefix: string
  versioningEnabled?: boolean
  showingVersions?: boolean // Flag to indicate we're in versions view mode
  onFolderClick: (prefix: string) => void
  onDeleteObjectSuccess: (objectKey: string) => void
  onDeleteObjectError: (objectKey: string, errorMessage: string) => void
  onCopyObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string, wasOverwritten: boolean) => void
  onCopyObjectError: (objectKey: string, errorMessage: string) => void
  onMoveObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string) => void
  onMoveObjectError: (objectKey: string, errorMessage: string) => void
  onEditMetadataSuccess: (objectKey: string) => void
  onEditMetadataError: (objectKey: string, errorMessage: string) => void
  onDownloadError: (objectKey: string, errorMessage: string) => void
  onRestoreVersion?: (objectKey: string, versionId: string) => void
  onDeleteVersion?: (objectKey: string, versionId: string) => void
}

export function ObjectsTableView({
  bucketName,
  objects,
  folders,
  versions,
  currentPrefix,
  versioningEnabled = false,
  showingVersions = false,
  onFolderClick,
  onDeleteObjectSuccess,
  onDeleteObjectError,
  onCopyObjectSuccess,
  onCopyObjectError,
  onMoveObjectSuccess,
  onMoveObjectError,
  onEditMetadataSuccess,
  onEditMetadataError,
  onDownloadError,
  onRestoreVersion,
  onDeleteVersion,
}: ObjectsTableViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const parentRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string
    size?: number
    lastModified?: string
  } | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{
    key: string
    versionId: string
    size?: number
    lastModified?: string
  } | null>(null)
  const [copyTarget, setCopyTarget] = useState<{
    key: string
    size?: number
  } | null>(null)
  const [moveTarget, setMoveTarget] = useState<{
    key: string
    size?: number
  } | null>(null)
  const [editMetadataTarget, setEditMetadataTarget] = useState<string | null>(null)
  const [versionHistoryTarget, setVersionHistoryTarget] = useState<string | null>(null)
  // Keyed by row.key so multiple rows can have an in-flight download/preview
  // at once without one transfer's completion clobbering another's state.
  const [activeTransfers, setActiveTransfers] = useState<Map<string, ActiveTransfer>>(new Map())

  // Stream the object from the BFF and assemble a Blob. downloadId is set before
  // the mutation starts so the watchDownloadProgress subscription is active from
  // the very first byte. Chunks arrive base64-encoded (JSON/SSE transport).
  // Returns the resolved contentType so the caller can decide preview vs download.
  const streamObjectToBlob = async (
    row: ObjectRow,
    activeDownloadId: string
  ): Promise<{ blob: Blob; filename: string; contentType: string }> => {
    let contentType = "application/octet-stream"
    let filename = row.displayName

    const iterable = await trpcClient.storage.ceph.objects.downloadObject.mutate({
      project_id: projectId,
      containerName: bucketName,
      objectKey: row.key,
      filename: row.displayName,
      downloadId: activeDownloadId,
    })

    const chunks: Uint8Array<ArrayBuffer>[] = []
    for await (const { chunk, contentType: ct, filename: fn } of iterable) {
      if (ct) contentType = ct
      if (fn) filename = fn
      chunks.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>)
    }

    return { blob: new Blob(chunks, { type: contentType }), filename, contentType }
  }

  const triggerAnchorDownload = (url: string, filename: string) => {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  // Context-menu Download: always forces a file save, regardless of type.
  const handleDownload = async (row: ObjectRow) => {
    const activeDownloadId = `${bucketName}:${row.key}:${crypto.randomUUID()}`
    setActiveTransfers((prev) => new Map(prev).set(row.key, { kind: "download", downloadId: activeDownloadId }))
    try {
      const { blob, filename } = await streamObjectToBlob(row, activeDownloadId)
      triggerAnchorDownload(URL.createObjectURL(blob), filename)
    } catch (err) {
      onDownloadError(row.key, err instanceof Error ? err.message : String(err))
    } finally {
      if (isMounted.current) {
        setActiveTransfers((prev) => {
          // Only clear this row's entry if it's still the one we started —
          // guards against a stale request's cleanup wiping a newer transfer's
          // state if the row was clicked again after this one began.
          if (prev.get(row.key)?.downloadId !== activeDownloadId) return prev
          const next = new Map(prev)
          next.delete(row.key)
          return next
        })
      }
    }
  }

  // Open a blob URL in a new tab for preview. Uses an anchor with
  // target="_blank" rather than window.open — anchors are not subject to the
  // same post-await popup-blocking that window.open is, so we can open the tab
  // *after* streaming completes and only for files we know are previewable.
  const openBlobInNewTab = (url: string) => {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.target = "_blank"
    anchor.rel = "noopener,noreferrer"
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  // Row-click: stream the object, then decide from its actual Content-Type —
  // previewable types open in a new tab, everything else downloads. Nothing is
  // opened until the type is known, so non-previewable files download with no
  // blank-tab flash.
  const handlePreviewOrDownload = async (row: ObjectRow) => {
    const activeDownloadId = `${bucketName}:${row.key}:${crypto.randomUUID()}`
    setActiveTransfers((prev) => new Map(prev).set(row.key, { kind: "preview", downloadId: activeDownloadId }))
    try {
      const { blob, filename, contentType } = await streamObjectToBlob(row, activeDownloadId)
      const url = URL.createObjectURL(blob)
      if (isPreviewableContentType(contentType)) {
        openBlobInNewTab(url)
      } else {
        triggerAnchorDownload(url, filename)
      }
    } catch (err) {
      onDownloadError(row.key, err instanceof Error ? err.message : String(err))
    } finally {
      if (isMounted.current) {
        setActiveTransfers((prev) => {
          // Same guard as handleDownload: only clear the entry we started.
          if (prev.get(row.key)?.downloadId !== activeDownloadId) return prev
          const next = new Map(prev)
          next.delete(row.key)
          return next
        })
      }
    }
  }

  // Strip current prefix from display names
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  // Build combined rows — folders first, then objects or versions
  const rows: CephRow[] =
    showingVersions && versions
      ? [
          ...folders.map(
            (f): FolderRow => ({
              kind: "folder",
              prefix: f.prefix,
              displayName: stripPrefix(f.prefix).replace(/\/$/, ""),
            })
          ),
          ...versions.map(
            (v): VersionRow => ({
              kind: "version",
              key: v.key,
              versionId: v.versionId,
              isLatest: v.isLatest,
              isDeleteMarker: v.isDeleteMarker,
              isDeleted: v.isDeleted, // Carry over the isDeleted flag
              size: v.size,
              lastModified: v.lastModified,
              displayName: stripPrefix(v.key),
            })
          ),
        ]
      : [
          ...folders.map(
            (f): FolderRow => ({
              kind: "folder",
              prefix: f.prefix,
              displayName: stripPrefix(f.prefix).replace(/\/$/, ""),
            })
          ),
          ...objects.map(
            (o): ObjectRow => ({
              kind: "object",
              key: o.key,
              size: o.size,
              lastModified: o.lastModified,
              displayName: stripPrefix(o.key),
            })
          ),
        ]

  // Calculate scrollbar width to keep the fixed header aligned with the scrollable body
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [rows.length])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  if (rows.length === 0) {
    return (
      <>
        <DataGrid columns={4}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Name</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Size</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Last Modified</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell />
          </DataGridRow>
          <DataGridRow>
            <DataGridCell colSpan={4}>
              <div className="py-8 text-center">
                <p className="text-theme-light">
                  <Trans>No objects found.</Trans>
                </p>
              </div>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
        <DeleteObjectModal
          bucketName={bucketName}
          objectKey={deleteTarget?.key ?? ""}
          objectSize={deleteTarget?.size}
          lastModified={deleteTarget?.lastModified}
          versioningEnabled={versioningEnabled}
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onSuccess={onDeleteObjectSuccess}
          onError={onDeleteObjectError}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid columns={4} gridColumnTemplate={GRID_COLUMN_TEMPLATE} data-testid="objects-table-header">
            <DataGridRow>
              <DataGridHeadCell>
                <Trans>Name</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Size</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Last Modified</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }} />
            </DataGridRow>
          </DataGrid>
        </div>

        {/* Virtualized Table Body with dynamic height */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: "calc(100vh - 500px)" }}
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
              const row = rows[virtualRow.index]
              const isFolder = row.kind === "folder"
              const isVersion = row.kind === "version"
              const isDeletedFile = isVersion && row.isDeleted // File that was deleted (can be restored)
              const activeTransfer = row.kind === "object" ? activeTransfers.get(row.key) : undefined
              const isDownloading = activeTransfer?.kind === "download"
              const isPreviewing = activeTransfer?.kind === "preview"
              const isStreaming = activeTransfer !== undefined
              const displayName = row.displayName

              return (
                <div
                  key={isFolder ? row.prefix : isVersion ? `${row.key}-${row.versionId}` : row.key}
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
                    gridTemplateColumns: GRID_COLUMN_TEMPLATE,
                    alignItems: "stretch",
                  }}
                  data-testid={isFolder ? `folder-row-${row.prefix}` : `object-row-${row.key}`}
                >
                  {/* Name */}
                  <DataGridCell>
                    {isFolder ? (
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline focus-visible:outline-2"
                        onClick={() => onFolderClick(row.prefix)}
                        title={row.prefix}
                      >
                        <MdFolder size={18} className="text-theme-light shrink-0" />
                        <span className="truncate text-sm">{row.displayName}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isStreaming ? (
                          <Spinner size="small" className="shrink-0" />
                        ) : (
                          <MdDescription size={18} className="text-theme-light shrink-0" />
                        )}
                        <button
                          type="button"
                          className="min-w-0 truncate text-left text-sm hover:underline focus-visible:outline focus-visible:outline-2 disabled:cursor-wait disabled:no-underline"
                          onClick={row.kind === "object" ? () => handlePreviewOrDownload(row) : undefined}
                          disabled={row.kind !== "object" || isStreaming}
                          title={
                            row.kind !== "object"
                              ? t`Preview and download aren't available for older versions yet`
                              : isStreaming
                                ? isPreviewing
                                  ? t`Loading preview...`
                                  : t`Downloading...`
                                : t`Open ${displayName}`
                          }
                        >
                          {row.displayName}
                        </button>
                        {isDeletedFile && (
                          <Badge variant="error">
                            <Trans>Deleted</Trans>
                          </Badge>
                        )}
                      </div>
                    )}
                  </DataGridCell>

                  {/* Size */}
                  <DataGridCell>
                    <span className="text-sm">{isFolder ? "—" : formatBytesBinary(row.size)}</span>
                  </DataGridCell>

                  {/* Last Modified */}
                  <DataGridCell>
                    {isStreaming && activeTransfer ? (
                      <RowTransferProgress
                        projectId={projectId}
                        downloadId={activeTransfer.downloadId}
                        isPreviewing={isPreviewing}
                      />
                    ) : (
                      <span className="text-sm">
                        {!isFolder && row.lastModified ? new Date(row.lastModified).toLocaleString() : "—"}
                      </span>
                    )}
                  </DataGridCell>

                  {/* Actions */}
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      {/* Don't show actions menu for folders in versions view mode */}
                      {!(isFolder && showingVersions) && (
                        <PopupMenu>
                          <PopupMenuOptions>
                            {isFolder ? (
                              <PopupMenuItem label={t`Delete`} onClick={() => setDeleteTarget({ key: row.prefix })} />
                            ) : isDeletedFile ? (
                              // For deleted files, only show "Restore" action
                              <PopupMenuItem
                                label={t`Restore`}
                                onClick={() => {
                                  if (row.kind === "version") {
                                    setRestoreTarget({
                                      key: row.key,
                                      versionId: row.versionId,
                                      size: row.size,
                                      lastModified: row.lastModified,
                                    })
                                  }
                                }}
                              />
                            ) : (
                              <>
                                <PopupMenuItem
                                  label={isDownloading ? t`Downloading...` : t`Download`}
                                  disabled={row.kind !== "object" || isStreaming}
                                  onClick={row.kind === "object" ? () => handleDownload(row) : undefined}
                                  data-testid={`download-action-${row.key}`}
                                />
                                {versioningEnabled && !isVersion && (
                                  <PopupMenuItem
                                    label={t`View Versions`}
                                    onClick={() => setVersionHistoryTarget(row.key)}
                                  />
                                )}
                                <PopupMenuItem
                                  label={t`Copy`}
                                  onClick={() => setCopyTarget({ key: row.key, size: row.size })}
                                />
                                <PopupMenuItem
                                  label={t`Move/Rename`}
                                  onClick={() => setMoveTarget({ key: row.key, size: row.size })}
                                />
                                <PopupMenuItem
                                  label={t`Edit Metadata`}
                                  onClick={() => setEditMetadataTarget(row.key)}
                                />
                                <PopupMenuItem
                                  label={t`Delete`}
                                  onClick={() =>
                                    setDeleteTarget({
                                      key: row.key,
                                      size: row.size,
                                      lastModified: row.lastModified,
                                    })
                                  }
                                />
                              </>
                            )}
                          </PopupMenuOptions>
                        </PopupMenu>
                      )}
                    </div>
                  </DataGridCell>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DeleteObjectModal
        bucketName={bucketName}
        objectKey={deleteTarget?.key ?? ""}
        objectSize={deleteTarget?.size}
        lastModified={deleteTarget?.lastModified}
        versioningEnabled={versioningEnabled}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onSuccess={onDeleteObjectSuccess}
        onError={onDeleteObjectError}
      />

      <RestoreVersionModal
        bucketName={bucketName}
        objectKey={restoreTarget?.key ?? ""}
        versionId={restoreTarget?.versionId ?? ""}
        versionSize={restoreTarget?.size}
        versionDate={restoreTarget?.lastModified}
        isOpen={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onSuccess={(key, versionId) => {
          setRestoreTarget(null)
          onRestoreVersion?.(key, versionId)
        }}
        onError={() => {
          setRestoreTarget(null)
          // Error is shown in the modal itself via mutation error state
        }}
      />

      <CopyObjectModal
        bucketName={bucketName}
        objectKey={copyTarget?.key ?? ""}
        objectSize={copyTarget?.size}
        isOpen={copyTarget !== null}
        onClose={() => setCopyTarget(null)}
        onSuccess={onCopyObjectSuccess}
        onError={onCopyObjectError}
      />

      <MoveObjectModal
        bucketName={bucketName}
        objectKey={moveTarget?.key ?? ""}
        objectSize={moveTarget?.size}
        isOpen={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        onSuccess={onMoveObjectSuccess}
        onError={onMoveObjectError}
      />

      <EditMetadataModal
        bucketName={bucketName}
        objectKey={editMetadataTarget ?? ""}
        isOpen={editMetadataTarget !== null}
        onClose={() => setEditMetadataTarget(null)}
        onSuccess={onEditMetadataSuccess}
        onError={onEditMetadataError}
      />

      <ObjectVersionHistoryModal
        isOpen={versionHistoryTarget !== null}
        bucketName={bucketName}
        objectKey={versionHistoryTarget ?? ""}
        onClose={() => setVersionHistoryTarget(null)}
        onRestoreVersion={onRestoreVersion}
        onDeleteVersion={onDeleteVersion}
      />
    </>
  )
}

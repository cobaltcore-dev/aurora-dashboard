import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { Spinner } from "@cloudoperators/juno-ui-components"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { trpcClient } from "@/client/trpcClient"
import { BrowserRow, FolderRow, ObjectRow } from "./"
import { DeleteFolderModal } from "./DeleteFolderModal"
import { DeleteObjectModal } from "./DeleteObjectModal"
import { CopyObjectModal } from "./CopyObjectModal"
import { MoveRenameObjectModal } from "./MoveRenameObjectModal"
import { GenerateTempUrlModal } from "./GenerateTempUrlModal"

// MIME types natively previewable by all modern browsers.
// Excludes types that require plugins or have inconsistent support.
const BROWSER_PREVIEWABLE_TYPES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  // Video
  "video/mp4",
  "video/webm",
  "video/ogg",
  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/flac",
  // Documents
  "application/pdf",
  // Safe text — plain content only, no script-executing types
  "text/plain",
])

const isBrowserPreviewable = (contentType: string | undefined): boolean => {
  if (!contentType) return false
  // Strip parameters like charset (e.g. "text/plain; charset=utf-8" → "text/plain")
  const base = contentType.split(";")[0].trim().toLowerCase()
  if (BROWSER_PREVIEWABLE_TYPES.has(base)) return true
  // Allow image/*, video/*, audio/* subtypes broadly — these are passive media
  // that cannot execute scripts. Excluded: text/html, text/javascript, text/css,
  // application/json, application/xml and any other active/scriptable types.
  // image/svg+xml is also excluded — SVG can contain embedded <script> tags and
  // executes JavaScript when opened as a same-origin blob URL.
  if (base === "image/svg+xml") return false
  if (base.startsWith("image/") || base.startsWith("video/") || base.startsWith("audio/")) return true
  return false
}

// Define column template — 4 columns: name | last modified | size | actions
const GRID_COLUMN_TEMPLATE = "minmax(200px, 3fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"

interface ObjectsTableViewProps {
  rows: BrowserRow[]
  searchTerm: string
  container: string
  account?: string
  onFolderClick: (prefix: string) => void
  onDeleteFolderSuccess: (folderName: string, deletedCount: number) => void
  onDeleteFolderError: (folderName: string, errorMessage: string) => void
  onDownloadError: (objectName: string, errorMessage: string) => void
  onDeleteObjectSuccess: (objectName: string) => void
  onDeleteObjectError: (objectName: string, errorMessage: string) => void
  onCopyObjectSuccess: (objectName: string, targetContainer: string, targetPath: string) => void
  onCopyObjectError: (objectName: string, errorMessage: string) => void
  onMoveObjectSuccess: (objectName: string, targetContainer: string, targetPath: string) => void
  onMoveObjectError: (objectName: string, errorMessage: string) => void
  onTempUrlCopySuccess: (objectName: string) => void
}

export const ObjectsTableView = ({
  rows,
  searchTerm,
  container,
  account,
  onFolderClick,
  onDeleteFolderSuccess,
  onDeleteFolderError,
  onDownloadError,
  onDeleteObjectSuccess,
  onDeleteObjectError,
  onCopyObjectSuccess,
  onCopyObjectError,
  onMoveObjectSuccess,
  onMoveObjectError,
  onTempUrlCopySuccess,
}: ObjectsTableViewProps) => {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderRow | null>(null)
  const [deleteObjectTarget, setDeleteObjectTarget] = useState<ObjectRow | null>(null)
  const [copyObjectTarget, setCopyObjectTarget] = useState<ObjectRow | null>(null)
  const [moveRenameObjectTarget, setMoveRenameObjectTarget] = useState<ObjectRow | null>(null)
  const [tempUrlTarget, setTempUrlTarget] = useState<ObjectRow | null>(null)
  const [downloadingRow, setDownloadingRow] = useState<ObjectRow | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null)
  const [previewingRow, setPreviewingRow] = useState<ObjectRow | null>(null)

  // Shared streaming helper — fetches the object from the BFF and assembles a Blob.
  // onProgress is called for each chunk; pass null to skip progress tracking.
  const streamObjectToBlob = async (
    row: ObjectRow,
    onProgress: ((progress: { downloaded: number; total: number }) => void) | null
  ): Promise<{ blob: Blob; filename: string }> => {
    let contentType = row.content_type ?? "application/octet-stream"
    let filename = row.displayName

    const iterable = await trpcClient.storage.swift.downloadObject.mutate({
      container,
      object: row.name,
      filename: row.displayName,
      ...(account ? { account } : {}),
    })

    const chunks: Uint8Array<ArrayBuffer>[] = []
    for await (const { chunk, contentType: ct, filename: fn, downloaded, total } of iterable) {
      if (ct) contentType = ct
      if (fn) filename = fn
      chunks.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>)
      onProgress?.({ downloaded, total })
    }

    return { blob: new Blob(chunks, { type: contentType }), filename }
  }

  // Triggers a browser file-save for the given blob URL then revokes it after a
  // short delay to avoid racing the browser starting the download.
  const triggerAnchorDownload = (url: string, filename: string) => {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const handleDownload = async (row: ObjectRow) => {
    setDownloadingRow(row)
    try {
      const { blob, filename } = await streamObjectToBlob(row, (p) => setDownloadProgress(p))
      triggerAnchorDownload(URL.createObjectURL(blob), filename)
    } catch (err) {
      onDownloadError(row.displayName, err instanceof Error ? err.message : String(err))
    } finally {
      if (isMounted.current) {
        setDownloadingRow(null)
        setDownloadProgress(null)
      }
    }
  }

  const handlePreviewOrDownload = async (row: ObjectRow) => {
    const previewing = isBrowserPreviewable(row.content_type)
    if (previewing) {
      setPreviewingRow(row)
    } else {
      setDownloadingRow(row)
    }

    // Open a blank tab synchronously while still inside the click handler so
    // The popup is considered user-initiated and won't be blocked. Clear the
    // opener relationship immediately so previewed content cannot access the
    // current window, while still keeping the window reference for navigation
    // after streaming completes.
    const previewTab = previewing ? window.open("", "_blank") : null
    if (previewTab) {
      previewTab.opener = null
    }

    try {
      const { blob, filename } = await streamObjectToBlob(row, previewing ? null : (p) => setDownloadProgress(p))
      const url = URL.createObjectURL(blob)
      if (previewing) {
        if (previewTab) {
          previewTab.location.href = url
        }
        // Revoke after a short delay to give the new tab time to load the blob
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        triggerAnchorDownload(url, filename)
      }
    } catch (err) {
      previewTab?.close()
      onDownloadError(row.displayName, err instanceof Error ? err.message : String(err))
    } finally {
      if (isMounted.current) {
        setPreviewingRow(null)
        setDownloadingRow(null)
        setDownloadProgress(null)
      }
    }
  }

  // Calculate scrollbar width
  // Pad the header right by scrollbar width to keep columns aligned with the body
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [rows.length])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 10,
  })

  // Format date to localized string
  const formatDate = (dateString: string): string => {
    const d = new Date(dateString)
    return Number.isNaN(d.getTime()) ? t`N/A` : d.toLocaleString()
  }

  if (rows.length === 0) {
    return (
      <DataGrid columns={4} className="objects" data-testid="no-objects">
        <DataGridRow>
          <DataGridCell colSpan={4}>
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
    )
  }

  const allCount = rows.length
  const isAnyDownloading = downloadingRow !== null || previewingRow !== null

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={4}
            gridColumnTemplate={GRID_COLUMN_TEMPLATE}
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
              <DataGridHeadCell>
                <Trans>Size</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }} />
            </DataGridRow>
          </DataGrid>
        </div>

        {/* Virtualized Table Body with dynamic height */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: "calc(100vh - 550px)" }}
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
              const isDownloading = !isFolder && downloadingRow?.name === row.name
              const rowDisplayName = row.displayName

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
                    gridTemplateColumns: GRID_COLUMN_TEMPLATE,
                    alignItems: "stretch",
                  }}
                  data-testid={`object-row-${row.name}`}
                >
                  {/* Name */}
                  <DataGridCell className="min-w-0 overflow-hidden">
                    {isFolder ? (
                      <button
                        type="button"
                        className="focus-visible:outline-theme-focus flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline focus-visible:outline-2"
                        onClick={() => onFolderClick(row.name)}
                        data-testid={`folder-${row.name}`}
                        title={row.displayName}
                      >
                        <MdFolder size={18} className="text-theme-light shrink-0" />
                        <span className="truncate">{row.displayName}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="focus-visible:outline-theme-focus flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline focus-visible:outline-2 disabled:cursor-wait disabled:opacity-60"
                        onClick={() => handlePreviewOrDownload(row as ObjectRow)}
                        disabled={isAnyDownloading}
                        data-testid={`preview-${row.name}`}
                        title={
                          isBrowserPreviewable((row as ObjectRow).content_type)
                            ? t`Preview ${rowDisplayName}`
                            : t`Download ${rowDisplayName}`
                        }
                      >
                        {previewingRow?.name === row.name ? (
                          <Spinner size="small" className="shrink-0" />
                        ) : (
                          <MdDescription size={18} className="text-theme-light shrink-0" />
                        )}
                        <span className="truncate">{row.displayName}</span>
                      </button>
                    )}
                  </DataGridCell>

                  {/* Last Modified */}
                  <DataGridCell>
                    {isDownloading ? (
                      <span className="flex min-w-0 flex-col gap-1">
                        {(() => {
                          const progressPct =
                            downloadProgress && downloadProgress.total > 0
                              ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)
                              : null
                          return (
                            <>
                              <span className="text-theme-light flex items-center gap-2 text-sm">
                                <Spinner size="small" />
                                {progressPct !== null ? <Trans>{progressPct}%</Trans> : <Trans>Downloading...</Trans>}
                              </span>
                              {progressPct !== null && (
                                <div className="bg-theme-background-lvl-2 h-1 w-full overflow-hidden rounded-full">
                                  <div
                                    className="bg-theme-accent h-1 rounded-full transition-all duration-150"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </span>
                    ) : !isFolder && row.last_modified ? (
                      formatDate(row.last_modified)
                    ) : (
                      "—"
                    )}
                  </DataGridCell>

                  {/* Size */}
                  <DataGridCell>{!isFolder ? formatBytesBinary(row.bytes) : "—"}</DataGridCell>

                  {/* Actions */}
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <PopupMenu disabled={isAnyDownloading}>
                      <PopupMenuOptions>
                        {isFolder ? (
                          // Folder actions
                          <PopupMenuItem
                            label={t`Delete Recursively`}
                            onClick={() => setDeleteFolderTarget(row as FolderRow)}
                            data-testid={`delete-recursively-action-${row.name}`}
                          />
                        ) : (
                          // File actions
                          <>
                            <PopupMenuItem
                              label={isDownloading ? t`Downloading...` : t`Download`}
                              disabled={isDownloading}
                              onClick={() => handleDownload(row as ObjectRow)}
                              data-testid={`download-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Properties`}
                              onClick={() => {
                                // TODO: open ObjectPropertiesModal
                              }}
                              data-testid={`properties-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Copy`}
                              onClick={() => setCopyObjectTarget(row as ObjectRow)}
                              data-testid={`copy-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Move/Rename`}
                              onClick={() => setMoveRenameObjectTarget(row as ObjectRow)}
                              data-testid={`move-rename-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Share (Temporary URL)`}
                              onClick={() => setTempUrlTarget(row as ObjectRow)}
                              data-testid={`temp-url-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Delete`}
                              onClick={() => setDeleteObjectTarget(row as ObjectRow)}
                              data-testid={`delete-action-${row.name}`}
                            />
                          </>
                        )}
                      </PopupMenuOptions>
                    </PopupMenu>
                  </DataGridCell>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer with count */}
        <div className="text-theme-light border-theme-background-lvl-2 border-t px-4 py-2 text-sm">
          <Trans>{allCount} items</Trans>
        </div>
      </div>

      <DeleteFolderModal
        isOpen={deleteFolderTarget !== null}
        folder={deleteFolderTarget}
        onClose={() => setDeleteFolderTarget(null)}
        onSuccess={onDeleteFolderSuccess}
        onError={onDeleteFolderError}
      />

      <DeleteObjectModal
        isOpen={deleteObjectTarget !== null}
        object={deleteObjectTarget}
        onClose={() => setDeleteObjectTarget(null)}
        onSuccess={onDeleteObjectSuccess}
        onError={onDeleteObjectError}
      />

      <CopyObjectModal
        isOpen={copyObjectTarget !== null}
        object={copyObjectTarget}
        onClose={() => setCopyObjectTarget(null)}
        onSuccess={onCopyObjectSuccess}
        onError={onCopyObjectError}
      />

      <MoveRenameObjectModal
        isOpen={moveRenameObjectTarget !== null}
        object={moveRenameObjectTarget}
        onClose={() => setMoveRenameObjectTarget(null)}
        onSuccess={onMoveObjectSuccess}
        onError={onMoveObjectError}
      />

      <GenerateTempUrlModal
        isOpen={tempUrlTarget !== null}
        object={tempUrlTarget}
        onClose={() => setTempUrlTarget(null)}
        onCopySuccess={onTempUrlCopySuccess}
      />
    </>
  )
}

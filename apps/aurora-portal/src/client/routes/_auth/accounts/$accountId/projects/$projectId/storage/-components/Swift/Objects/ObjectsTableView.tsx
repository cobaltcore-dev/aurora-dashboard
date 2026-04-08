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
}: ObjectsTableViewProps) => {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderRow | null>(null)
  const [downloadingRow, setDownloadingRow] = useState<ObjectRow | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null)

  const handleDownload = async (row: ObjectRow) => {
    setDownloadingRow(row)
    try {
      const chunks: Uint8Array[] = []
      let contentType = "application/octet-stream"
      let filename = row.displayName

      const iterable = await trpcClient.storage.swift.downloadObject.mutate({
        container,
        object: row.name,
        filename: row.displayName,
        ...(account ? { account } : {}),
      })

      for await (const { chunk, contentType: ct, filename: fn, downloaded, total } of iterable) {
        if (ct) contentType = ct
        if (fn) filename = fn
        chunks.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)))
        setDownloadProgress({ downloaded, total })
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
      const merged = new Uint8Array(totalLength)
      let offset = 0
      for (const c of chunks) {
        merged.set(c, offset)
        offset += c.length
      }

      const blob = new Blob([merged], { type: contentType })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (err) {
      onDownloadError(row.displayName, err instanceof Error ? err.message : String(err))
    } finally {
      setDownloadingRow(null)
      setDownloadProgress(null)
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
              const row = rows[virtualRow.index]
              const isFolder = row.kind === "folder"
              const isDownloading = !isFolder && downloadingRow?.name === row.name

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
                      <span className="flex min-w-0 items-center gap-2" title={row.displayName}>
                        <MdDescription size={18} className="text-theme-light shrink-0" />
                        <span className="truncate">{row.displayName}</span>
                      </span>
                    )}
                  </DataGridCell>

                  {/* Last Modified */}
                  <DataGridCell>
                    {isDownloading ? (
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-theme-light flex items-center gap-2 text-sm">
                          <Spinner size="small" />
                          {downloadProgress && downloadProgress.total > 0 ? (
                            <Trans>{Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%</Trans>
                          ) : (
                            <Trans>Downloading...</Trans>
                          )}
                        </span>
                        {downloadProgress && downloadProgress.total > 0 && (
                          <div className="bg-theme-background-lvl-2 h-1 w-full overflow-hidden rounded-full">
                            <div
                              className="bg-theme-accent h-1 rounded-full transition-all duration-150"
                              style={{
                                width: `${Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
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
                    <PopupMenu disabled={isDownloading}>
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
                              onClick={() => {
                                // TODO: open CopyObjectModal
                              }}
                              data-testid={`copy-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Move/Rename`}
                              onClick={() => {
                                // TODO: open MoveRenameObjectModal
                              }}
                              data-testid={`move-rename-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Delete`}
                              onClick={() => {
                                // TODO: open DeleteObjectModal
                              }}
                              data-testid={`delete-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Delete (Keep Segments)`}
                              onClick={() => {
                                // TODO: open DeleteObjectKeepSegmentsModal
                              }}
                              data-testid={`delete-keep-segments-action-${row.name}`}
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
    </>
  )
}

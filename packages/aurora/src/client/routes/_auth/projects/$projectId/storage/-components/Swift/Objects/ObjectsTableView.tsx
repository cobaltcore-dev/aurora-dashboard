import { useEffect, useState, useSyncExternalStore } from "react"
import {
  Checkbox,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Icon,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Spinner,
  toast,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useVirtualizedTableBody } from "@/client/hooks/useVirtualizedTableBody"
import { BrowserRow, FolderRow, ObjectRow } from "./"
import { DeleteFolderModal } from "./DeleteFolderModal"
import { DeleteObjectModal } from "./DeleteObjectModal"
import { CopyObjectModal } from "./CopyObjectModal"
import { MoveRenameObjectModal } from "./MoveRenameObjectModal"
import { GenerateTempUrlModal } from "./GenerateTempUrlModal"
import { EditObjectMetadataModal } from "./EditObjectMetadataModal"
import { getObjectDownloadCancelledToast } from "./ObjectToastNotifications"
import {
  startObjectDownload,
  cancelObjectDownload,
  subscribeTransfers,
  getTransfersSnapshot,
  transferKey,
  isPreviewableContentType,
} from "./stores/objectDownloadStore"

// The transfer lifecycle (worker, streaming, decode, Blob, DOM save) lives in
// ./stores/objectDownloadStore so downloads survive this component unmounting
// (ObjectBrowserView swaps in a <Spinner> while a folder loads). This component
// only reads the store for UI and drives start/cancel.

// Subscribes to live progress for a single in-flight transfer. Each active row
// renders its own instance (keyed by downloadId), so concurrent transfers each
// get an independent subscription rather than sharing one — starting a second
// transfer never disrupts the first's progress. Swift's watchDownloadProgress
// scopes to the project via the token server-side, so only downloadId is passed.
function RowTransferProgress({ downloadId, isPreviewing }: { downloadId: string; isPreviewing: boolean }) {
  const { data: progress } = trpcReact.storage.swift.watchDownloadProgress.useSubscription(
    { downloadId },
    { enabled: !!downloadId }
  )
  const percent = progress?.percent

  return (
    <span className="flex w-full flex-1 flex-col gap-1">
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

// Column templates — 5 columns with the selection checkbox, 4 without it:
// [checkbox |] name | last modified | size | actions
const GRID_COLUMN_TEMPLATE_WITH_SELECT = "40px minmax(200px, 3fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"
const GRID_COLUMN_TEMPLATE_NO_SELECT = "minmax(200px, 3fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"

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
  onEditMetadataSuccess: (objectName: string) => void
  onEditMetadataError: (objectName: string, errorMessage: string) => void
  selectedObjects: string[]
  setSelectedObjects: (objects: string[]) => void
  // When false, the selection column (header select-all + per-row checkboxes) is
  // dropped and the grid renders one fewer column. Defaults to true so existing
  // callers keep the selectable layout.
  hasAnyBulkAction?: boolean
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
  onEditMetadataSuccess,
  onEditMetadataError,
  selectedObjects,
  setSelectedObjects,
  hasAnyBulkAction = true,
}: ObjectsTableViewProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  // In-flight transfers are owned by the module store (outside React) so they
  // survive this component unmounting during folder navigation. We only read
  // them here for rendering.
  const activeTransfers = useSyncExternalStore(subscribeTransfers, getTransfersSnapshot)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderRow | null>(null)
  const [deleteObjectTarget, setDeleteObjectTarget] = useState<ObjectRow | null>(null)
  const [copyObjectTarget, setCopyObjectTarget] = useState<ObjectRow | null>(null)
  const [moveRenameObjectTarget, setMoveRenameObjectTarget] = useState<ObjectRow | null>(null)
  const [tempUrlTarget, setTempUrlTarget] = useState<ObjectRow | null>(null)
  const [editMetadataTarget, setEditMetadataTarget] = useState<ObjectRow | null>(null)

  // The "Downloading..." notification is raised by the store (one toast for all
  // in-flight transfers, dismissed when the last finishes), so starting a
  // transfer here is just the call.
  //
  // Context-menu Download: always forces a file save, regardless of type.
  const handleDownload = (row: ObjectRow) => {
    startObjectDownload({
      kind: "download",
      projectId,
      container,
      objectKey: row.name,
      filename: row.displayName,
      account,
      onError: onDownloadError,
    })
  }

  // Row-click: preview previewable types in a new tab, download everything else.
  const handlePreviewOrDownload = (row: ObjectRow) => {
    startObjectDownload({
      kind: "preview",
      projectId,
      container,
      objectKey: row.name,
      filename: row.displayName,
      account,
      onError: onDownloadError,
    })
  }

  // Cancel the in-flight transfer for a row. The store drops the entry right away
  // (UI clears on the next render, no worker round-trip) and tells the worker to
  // abort its tRPC call, which tears down the fetch so the BFF stops reading.
  // Cancellation is a user action, so confirm it with a toast, not an error.
  const handleCancelTransfer = (objectName: string) => {
    const transfer = cancelObjectDownload(container, objectName)
    if (!transfer) return
    const { message, ...options } = getObjectDownloadCancelledToast(objectName)
    toast.warning(message, options)
  }

  // Height measured from the space actually left below the table, plus a
  // virtualizer that stays silent until that height is known.
  const {
    ref: tableBodyRef,
    elementRef: parentRef,
    height: bodyHeight,
    virtualItems,
    totalSize,
    measureElement,
  } = useVirtualizedTableBody({ count: rows.length })

  // Calculate scrollbar width
  // Pad the header right by scrollbar width to keep columns aligned with the body
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [rows.length, bodyHeight])

  // Format date to localized string
  const formatDate = (dateString: string): string => {
    const d = new Date(dateString)
    return Number.isNaN(d.getTime()) ? t`N/A` : d.toLocaleString()
  }
  // Only object rows (not folders) are selectable
  const handleSelectObject = (name: string) => {
    if (selectedObjects.includes(name)) {
      setSelectedObjects(selectedObjects.filter((n) => n !== name))
    } else {
      setSelectedObjects([...selectedObjects, name])
    }
  }

  if (rows.length === 0) {
    return (
      <DataGrid columns={5} className="objects" data-testid="no-objects">
        <DataGridRow>
          <DataGridCell colSpan={5}>
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

  // Selection column is gated by hasAnyBulkAction — drop the leading checkbox
  // track (and one column) when no bulk action is available.
  const gridColumnTemplate = hasAnyBulkAction ? GRID_COLUMN_TEMPLATE_WITH_SELECT : GRID_COLUMN_TEMPLATE_NO_SELECT
  const columnCount = hasAnyBulkAction ? 5 : 4

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={columnCount}
            minContentColumns={[columnCount - 1]}
            gridColumnTemplate={gridColumnTemplate}
            className="objects"
            data-testid="objects-table-header"
          >
            <DataGridRow>
              {hasAnyBulkAction && (
                <DataGridHeadCell>
                  <span className="sr-only">
                    <Trans>Select</Trans>
                  </span>
                </DataGridHeadCell>
              )}
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

        {/* Virtualized Table Body — sized to the space actually left below the
            table, so banners above it shrink the table instead of growing the
            page. */}
        <div
          ref={tableBodyRef}
          className="overflow-auto"
          style={{ height: `${bodyHeight ?? 0}px` }}
          data-testid="objects-table-body"
        >
          <div
            style={{
              height: `${totalSize}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isFolder = row.kind === "folder"
              const activeTransfer = !isFolder ? activeTransfers.get(transferKey(container, row.name)) : undefined
              const isDownloading = activeTransfer?.kind === "download"
              const isPreviewing = activeTransfer?.kind === "preview"
              const isStreaming = activeTransfer !== undefined
              const rowDisplayName = row.displayName
              const isSelected = !isFolder && selectedObjects.includes(row.name)

              return (
                <div
                  key={row.name}
                  data-index={virtualRow.index}
                  ref={measureElement}
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
                  {/* Checkbox — only for object rows; folders get an empty cell.
                      The whole column is omitted when no bulk action is available. */}
                  {hasAnyBulkAction && (
                    <DataGridCell onClick={(e) => e.stopPropagation()}>
                      {isFolder ? (
                        // Folders have no bulk-delete operation in Swift — show a
                        // disabled checkbox with an explanatory tooltip so the column
                        // stays aligned and the user understands why. Folder deletion
                        // goes through the row menu ("Delete Recursively") instead.
                        <Tooltip triggerEvent="hover" placement="right">
                          <TooltipTrigger>
                            <Checkbox
                              disabled
                              aria-label={t`Folders cannot be bulk-deleted. Use the row menu to delete a folder.`}
                              data-testid={`select-folder-disabled-${row.name}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <Trans>Folders cannot be bulk-deleted. Use the row menu to delete a folder.</Trans>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          disabled={isStreaming}
                          onChange={() => handleSelectObject(row.name)}
                          data-testid={`select-object-${row.name}`}
                        />
                      )}
                    </DataGridCell>
                  )}

                  {/* Name */}
                  <DataGridCell className="min-w-0 overflow-hidden">
                    {isFolder ? (
                      <button
                        type="button"
                        className="focus-visible:outline-theme-focus flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline-2"
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
                        className="focus-visible:outline-theme-focus flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline-2 disabled:cursor-wait disabled:opacity-60"
                        onClick={() => handlePreviewOrDownload(row as ObjectRow)}
                        disabled={isStreaming}
                        data-testid={`preview-${row.name}`}
                        title={
                          isStreaming
                            ? isPreviewing
                              ? t`Loading preview...`
                              : t`Downloading...`
                            : isPreviewableContentType((row as ObjectRow).content_type ?? "")
                              ? t`Preview ${rowDisplayName}`
                              : t`Download ${rowDisplayName}`
                        }
                      >
                        {isStreaming && isPreviewing ? (
                          <Spinner size="small" className="shrink-0" data-testid={`preview-spinner-${row.name}`} />
                        ) : (
                          <MdDescription size={18} className="text-theme-light shrink-0" />
                        )}
                        <span className="truncate">{row.displayName}</span>
                      </button>
                    )}
                  </DataGridCell>

                  {/* Last Modified — doubles as the transfer progress + cancel cell
                      while a download/preview is in flight. */}
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    {isStreaming && activeTransfer && !isFolder ? (
                      <div className="flex items-center gap-2">
                        <RowTransferProgress downloadId={activeTransfer.downloadId} isPreviewing={isPreviewing} />
                        <button
                          type="button"
                          onClick={() => handleCancelTransfer(row.name)}
                          aria-label={t`Cancel`}
                          title={t`Cancel`}
                          className="focus-visible:outline-theme-focus text-theme-light hover:text-theme-danger shrink-0 cursor-pointer rounded focus-visible:outline-2"
                          data-testid={`cancel-transfer-${row.name}`}
                        >
                          <Icon icon="cancel" size={18} />
                        </button>
                      </div>
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
                    <PopupMenu>
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
                              disabled={isStreaming}
                              onClick={() => handleDownload(row as ObjectRow)}
                              data-testid={`download-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Edit Metadata`}
                              disabled={isStreaming}
                              onClick={() => setEditMetadataTarget(row as ObjectRow)}
                              data-testid={`edit-metadata-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Copy`}
                              disabled={isStreaming}
                              onClick={() => setCopyObjectTarget(row as ObjectRow)}
                              data-testid={`copy-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Move/Rename`}
                              disabled={isStreaming}
                              onClick={() => setMoveRenameObjectTarget(row as ObjectRow)}
                              data-testid={`move-rename-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Share URL`}
                              disabled={isStreaming}
                              onClick={() => setTempUrlTarget(row as ObjectRow)}
                              data-testid={`temp-url-action-${row.name}`}
                            />
                            <PopupMenuItem
                              label={t`Delete`}
                              disabled={isStreaming}
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
        account={account}
        onClose={() => setTempUrlTarget(null)}
        onCopySuccess={onTempUrlCopySuccess}
      />

      <EditObjectMetadataModal
        isOpen={editMetadataTarget !== null}
        object={editMetadataTarget}
        onClose={() => setEditMetadataTarget(null)}
        onSuccess={onEditMetadataSuccess}
        onError={onEditMetadataError}
      />
    </>
  )
}

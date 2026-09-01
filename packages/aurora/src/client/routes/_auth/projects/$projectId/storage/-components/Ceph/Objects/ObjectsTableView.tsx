import { useEffect, useState, useSyncExternalStore, useMemo } from "react"
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
  Icon,
  toast,
  Checkbox,
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
import type { S3Object, S3FolderPrefix, S3ObjectVersion } from "@/server/Storage/types/ceph"
import { getObjectDownloadCancelledToast, getPresignedUrlCopiedToast } from "./ObjectToastNotifications"
import {
  startObjectDownload,
  cancelObjectDownload,
  subscribeTransfers,
  getTransfersSnapshot,
  transferKey,
} from "./stores/objectDownloadStore"

// Extended version type for frontend use (includes isDeleted flag)
type S3ObjectVersionExtended = S3ObjectVersion & {
  isDeleted?: boolean // Flag for showing "Deleted" badge (file that can be restored)
  deleteMarkerVersionId?: string // VersionId of the delete marker (for permanent delete)
  allVersionIds?: string[] // All version IDs of this object (for complete deletion)
}
import { DeleteObjectModal } from "./DeleteObjectModal"
import { DeleteVersionModal } from "./DeleteVersionModal"
import { RestoreVersionModal } from "./RestoreVersionModal"
import { CopyObjectModal } from "./CopyObjectModal"
import { MoveObjectModal } from "./MoveObjectModal"
import { GeneratePresignedUrlModal } from "./GeneratePresignedUrlModal"
import { EditMetadataModal } from "./EditMetadataModal"
import { ObjectVersionHistoryModal } from "./ObjectVersionHistoryModal"

// The transfer lifecycle (worker, streaming, decode, Blob, DOM save) lives in
// ./stores/objectDownloadStore so downloads survive this component unmounting
// (ObjectBrowserView swaps in a <Spinner> while a folder loads). This component
// only reads the store for UI and drives start/cancel.

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

type FolderRow = {
  kind: "folder"
  prefix: string
  displayName: string
  isDeleted?: boolean
  deleteMarkerVersionId?: string
  folderMarkerVersionId?: string
}
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
  deleteMarkerVersionId?: string // VersionId of the delete marker (for permanent delete)
  allVersionIds?: string[] // All version IDs of this object (for complete deletion)
  size: number
  lastModified: string | undefined
  displayName: string
}
type CephRow = FolderRow | ObjectRow | VersionRow

// Define column templates — with and without selection column
const GRID_COLUMN_TEMPLATE_WITH_SELECT = "40px minmax(200px, 3fr) minmax(100px, 1fr) minmax(180px, 2fr) 60px"
const GRID_COLUMN_TEMPLATE_NO_SELECT = "minmax(200px, 3fr) minmax(100px, 1fr) minmax(180px, 2fr) 60px"

// Selection item type
type SelectedItem = { key: string; versionId?: string }

interface ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: Array<
    S3FolderPrefix & { isDeleted?: boolean; deleteMarkerVersionId?: string; folderMarkerVersionId?: string }
  >
  versions?: S3ObjectVersionExtended[] // When showing all versions (extended with isDeleted flag)
  currentPrefix: string
  versioningEnabled?: boolean
  showingVersions?: boolean // Flag to indicate we're in versions view mode
  selectable?: boolean
  selectedItems?: SelectedItem[]
  onToggleSelectKey?: (objectKey: string, versionId?: string) => void
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
  // Download Object and View Versions are never gated — they're reads, and this codebase's
  // convention is to gate mutations only.
  canCopyObject: boolean
  canMoveObject: boolean
  canUpdateObject: boolean
  canShareObject: boolean
  canDeleteObject: boolean
  canDeleteFolder: boolean
  canDeleteVersion: boolean
  canRestoreVersion: boolean
}

export function ObjectsTableView({
  bucketName,
  objects,
  folders,
  versions,
  currentPrefix,
  versioningEnabled = false,
  showingVersions = false,
  selectable = false,
  selectedItems = [],
  onToggleSelectKey,
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
  canCopyObject,
  canMoveObject,
  canUpdateObject,
  canShareObject,
  canDeleteObject,
  canDeleteFolder,
  canDeleteVersion,
  canRestoreVersion,
}: ObjectsTableViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  // In-flight transfers are owned by the module store (outside React) so they
  // survive this component unmounting during folder navigation. We only read
  // them here for rendering.
  const activeTransfers = useSyncExternalStore(subscribeTransfers, getTransfersSnapshot)
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
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<{
    key: string
    versionId: string
    size?: number
    lastModified?: string
    isDeleteMarker?: boolean
    folderMarkerVersionId?: string
    allVersionIds?: string[]
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
  const [presignedUrlTarget, setPresignedUrlTarget] = useState<{ key: string } | null>(null)

  // The "Downloading..." notification is raised by the store (one toast for all
  // in-flight transfers, dismissed when the last finishes), so starting a
  // transfer here is just the call.
  //
  // Context-menu Download: always forces a file save, regardless of type.
  const handleDownload = (row: ObjectRow) => {
    startObjectDownload({
      kind: "download",
      projectId,
      bucketName,
      objectKey: row.key,
      filename: row.displayName,
      onError: onDownloadError,
    })
  }

  // Row-click: preview previewable types in a new tab, download everything else.
  const handlePreviewOrDownload = (row: ObjectRow) => {
    startObjectDownload({
      kind: "preview",
      projectId,
      bucketName,
      objectKey: row.key,
      filename: row.displayName,
      onError: onDownloadError,
    })
  }

  // Cancel the in-flight transfer for a row. The store drops the entry right away
  // (UI clears on the next render, no worker round-trip) and tells the worker to
  // abort its tRPC call, which tears down the fetch so the BFF stops reading.
  // Cancellation is a user action, so confirm it with a toast, not an error.
  const handleCancelTransfer = (rowKey: string) => {
    const transfer = cancelObjectDownload(bucketName, rowKey)
    if (!transfer) return
    const { message, ...options } = getObjectDownloadCancelledToast(rowKey)
    toast.warning(message, options)
  }

  // Strip current prefix from display names
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  // Build combined rows — folders first, then objects or versions
  const rows: CephRow[] =
    showingVersions && versions
      ? [
          ...folders.map((f): FolderRow => ({
            kind: "folder",
            prefix: f.prefix,
            displayName: stripPrefix(f.prefix).replace(/\/$/, ""),
            isDeleted: f.isDeleted, // Carry over the isDeleted flag for deleted folder markers
            deleteMarkerVersionId: f.deleteMarkerVersionId, // Carry over delete marker versionId for restore
            folderMarkerVersionId: f.folderMarkerVersionId, // Carry over folder marker versionId for permanent delete
          })),
          ...versions.map((v): VersionRow => ({
            kind: "version",
            key: v.key,
            versionId: v.versionId,
            isLatest: v.isLatest,
            isDeleteMarker: v.isDeleteMarker,
            isDeleted: v.isDeleted, // Carry over the isDeleted flag
            deleteMarkerVersionId: v.deleteMarkerVersionId, // Carry over delete marker versionId for permanent delete
            allVersionIds: v.allVersionIds, // Carry over all version IDs for complete deletion
            size: v.size,
            lastModified: v.lastModified,
            displayName: stripPrefix(v.key),
          })),
        ]
      : [
          ...folders.map((f): FolderRow => ({
            kind: "folder",
            prefix: f.prefix,
            displayName: stripPrefix(f.prefix).replace(/\/$/, ""),
            isDeleted: f.isDeleted, // Carry over the isDeleted flag for deleted folder markers
            deleteMarkerVersionId: f.deleteMarkerVersionId, // Carry over delete marker versionId for restore
            folderMarkerVersionId: f.folderMarkerVersionId, // Carry over folder marker versionId for permanent delete
          })),
          ...objects.map((o): ObjectRow => ({
            kind: "object",
            key: o.key,
            size: o.size,
            lastModified: o.lastModified,
            displayName: stripPrefix(o.key),
          })),
        ]

  const selectedItemsSet = useMemo(() => {
    return new Set(selectedItems.map((item) => `${item.key}|${item.versionId ?? ""}`))
  }, [selectedItems])

  // Derived selection values
  const showSelection = selectable // Show selection for all tabs, including versions/deleted
  const gridColumnTemplate = showSelection ? GRID_COLUMN_TEMPLATE_WITH_SELECT : GRID_COLUMN_TEMPLATE_NO_SELECT
  const columnCount = showSelection ? 5 : 4

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

  // Calculate scrollbar width to keep the fixed header aligned with the scrollable body
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [rows.length, bodyHeight])

  if (rows.length === 0) {
    return (
      <>
        <DataGrid columns={columnCount}>
          <DataGridRow>
            {showSelection && (
              <DataGridHeadCell>
                <span className="sr-only">
                  <Trans>Select</Trans>
                </span>
              </DataGridHeadCell>
            )}
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
            <DataGridCell colSpan={columnCount}>
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
          <DataGrid
            columns={columnCount}
            gridColumnTemplate={gridColumnTemplate}
            data-testid="objects-table-header"
            minContentColumns={[columnCount - 1]}
          >
            <DataGridRow>
              {showSelection && (
                <DataGridHeadCell>
                  <span className="sr-only">
                    <Trans>Select</Trans>
                  </span>
                </DataGridHeadCell>
              )}
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

        {/* Virtualized Table Body — sized to the space actually left below the
            table, so banners above it shrink the table instead of growing the
            page. */}
        <div
          ref={tableBodyRef}
          className="overflow-auto"
          style={{ height: `${bodyHeight ?? 0}px` }}
          data-testid="objects-table-body"
        >
          <DataGrid
            style={{
              height: `${totalSize}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isFolder = row.kind === "folder"
              const isVersion = row.kind === "version"
              const isDeletedFile = isVersion && row.isDeleted // File that was deleted (can be restored)
              const activeTransfer =
                row.kind === "object" ? activeTransfers.get(transferKey(bucketName, row.key)) : undefined
              const isDownloading = activeTransfer?.kind === "download"
              const isPreviewing = activeTransfer?.kind === "preview"
              const isStreaming = activeTransfer !== undefined
              const displayName = row.displayName

              return (
                <DataGridRow
                  key={isFolder ? row.prefix : isVersion ? `${row.key}-${row.versionId}` : row.key}
                  data-index={virtualRow.index}
                  ref={measureElement}
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
                  data-testid={isFolder ? `folder-row-${row.prefix}` : `object-row-${row.key}`}
                >
                  {/* Selection column */}
                  {showSelection && (
                    <DataGridCell onClick={(e) => e.stopPropagation()}>
                      {row.kind === "object" ? (
                        (() => {
                          const displayName = row.displayName
                          const isSelected = selectedItemsSet.has(`${row.key}|`)
                          return (
                            <Checkbox
                              checked={isSelected}
                              disabled={isStreaming}
                              onChange={() => onToggleSelectKey?.(row.key)}
                              aria-label={t`Select ${displayName}`}
                              data-testid={`select-object-${row.key}`}
                            />
                          )
                        })()
                      ) : row.kind === "version" ? (
                        (() => {
                          const displayName = row.displayName
                          const isSelected = selectedItemsSet.has(`${row.key}|${row.versionId}`)
                          return (
                            <Checkbox
                              checked={isSelected}
                              onChange={() => onToggleSelectKey?.(row.key, row.versionId)}
                              aria-label={t`Select ${displayName}`}
                              data-testid={`select-version-${row.key}-${row.versionId}`}
                            />
                          )
                        })()
                      ) : row.kind === "folder" ? (
                        <Tooltip triggerEvent="hover" placement="right">
                          <TooltipTrigger>
                            <Checkbox
                              disabled
                              aria-label={t`Folders cannot be bulk-deleted. Use the row menu to delete a folder.`}
                              data-testid={`select-folder-disabled-${row.prefix}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <Trans>Folders cannot be bulk-deleted. Use the row menu to delete a folder.</Trans>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </DataGridCell>
                  )}
                  {/* Name */}
                  <DataGridCell>
                    {isFolder ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-2 rounded text-left hover:underline focus-visible:outline"
                          onClick={() => onFolderClick(row.prefix)}
                          title={row.prefix}
                        >
                          <MdFolder size={18} className="text-theme-light shrink-0" />
                          <span className="truncate text-sm">{row.displayName}</span>
                        </button>
                        {row.isDeleted && (
                          <Badge variant="error">
                            <Trans>Deleted</Trans>
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isStreaming ? (
                          <Spinner size="small" className="shrink-0" />
                        ) : (
                          <MdDescription size={18} className="text-theme-light shrink-0" />
                        )}
                        <button
                          type="button"
                          className="min-w-0 truncate text-left text-sm hover:underline focus-visible:outline disabled:cursor-wait disabled:no-underline"
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
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    {isStreaming && activeTransfer && row.kind === "object" ? (
                      <div className="flex items-center gap-2">
                        <RowTransferProgress
                          projectId={projectId}
                          downloadId={activeTransfer.downloadId}
                          isPreviewing={isPreviewing}
                        />
                        <Icon
                          icon="cancel"
                          size={18}
                          onClick={() => handleCancelTransfer(row.key)}
                          title={t`Cancel`}
                          className="text-theme-light hover:text-theme-danger shrink-0 cursor-pointer"
                          data-testid={`cancel-transfer-${row.key}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm">
                        {!isFolder && row.lastModified ? new Date(row.lastModified).toLocaleString() : "—"}
                      </span>
                    )}
                  </DataGridCell>

                  {/* Actions */}
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      {/* Show menu for: non-folders, non-version-view, or deleted folders in version view.
                          The normal-object branch always keeps Download Object / View Versions visible
                          (reads are never gated), so it can never end up empty. The folder and
                          deleted-file branches only offer gated mutations, so we also check
                          hasAnyRowAction there to avoid ever rendering an empty PopupMenu. */}
                      {(() => {
                        const shouldShowFolderMenu = !isFolder || !showingVersions || row.isDeleted
                        if (!shouldShowFolderMenu) return null

                        const hasAnyRowAction = isFolder
                          ? row.isDeleted
                            ? canRestoreVersion || canDeleteVersion
                            : canDeleteFolder
                          : isDeletedFile
                            ? canRestoreVersion || canDeleteVersion
                            : true // normal object: Download Object / View Versions are always visible

                        if (!hasAnyRowAction) return null

                        return (
                          <PopupMenu>
                            <PopupMenuOptions>
                              {isFolder ? (
                                row.isDeleted ? (
                                  // Deleted folder (has delete marker) - show Restore and Delete options
                                  <>
                                    {canRestoreVersion && (
                                      <PopupMenuItem
                                        label={t`Restore`}
                                        onClick={() => {
                                          // For folders, restoring means deleting the delete marker
                                          if (row.deleteMarkerVersionId) {
                                            setRestoreTarget({
                                              key: row.prefix,
                                              versionId: row.deleteMarkerVersionId,
                                              size: undefined,
                                              lastModified: undefined,
                                            })
                                          }
                                        }}
                                      />
                                    )}
                                    {/* Gated on canDeleteVersion, not canDeleteFolder - this permanently purges
                                        the delete marker/version, it's not a soft delete. */}
                                    {canDeleteVersion && (
                                      <PopupMenuItem
                                        label={t`Delete Folder`}
                                        onClick={() => {
                                          // Permanently delete the folder's delete marker and folder marker
                                          if (row.deleteMarkerVersionId) {
                                            setDeleteVersionTarget({
                                              key: row.prefix,
                                              versionId: row.deleteMarkerVersionId,
                                              size: undefined,
                                              lastModified: undefined,
                                              isDeleteMarker: true, // This version IS a delete marker
                                              folderMarkerVersionId: row.folderMarkerVersionId,
                                              // Show both IDs in the confirmation dialog
                                              allVersionIds: row.folderMarkerVersionId
                                                ? [row.deleteMarkerVersionId, row.folderMarkerVersionId]
                                                : undefined,
                                            })
                                          }
                                        }}
                                      />
                                    )}
                                  </>
                                ) : (
                                  // Regular folder - show Delete option
                                  canDeleteFolder && (
                                    <PopupMenuItem
                                      label={t`Delete Folder`}
                                      onClick={() => setDeleteTarget({ key: row.prefix })}
                                    />
                                  )
                                )
                              ) : isDeletedFile ? (
                                // For deleted files, show "Restore" and "Delete" actions
                                <>
                                  {canRestoreVersion && (
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
                                  )}
                                  {/* Gated on canDeleteVersion, not canDeleteObject - this permanently purges
                                      the delete marker/version, it's not a soft delete. */}
                                  {canDeleteVersion && (
                                    <PopupMenuItem
                                      label={t`Delete Object`}
                                      onClick={() => {
                                        if (row.kind === "version") {
                                          // For deleted files, delete all versions completely
                                          const versionIdToDelete = row.deleteMarkerVersionId ?? row.versionId
                                          setDeleteVersionTarget({
                                            key: row.key,
                                            versionId: versionIdToDelete,
                                            size: row.size,
                                            lastModified: row.lastModified,
                                            isDeleteMarker: !!row.deleteMarkerVersionId,
                                            allVersionIds: row.allVersionIds, // Pass all version IDs for complete deletion
                                          })
                                        }
                                      }}
                                    />
                                  )}
                                </>
                              ) : (
                                <>
                                  <PopupMenuItem
                                    label={isDownloading ? t`Downloading...` : t`Download Object`}
                                    disabled={row.kind !== "object" || isStreaming}
                                    onClick={row.kind === "object" ? () => handleDownload(row) : undefined}
                                    data-testid={`download-action-${row.key}`}
                                  />
                                  {versioningEnabled && !isVersion && (
                                    <PopupMenuItem
                                      label={t`View Versions`}
                                      disabled={isStreaming}
                                      onClick={() => setVersionHistoryTarget(row.key)}
                                    />
                                  )}
                                  {canCopyObject && (
                                    <PopupMenuItem
                                      label={t`Copy Object`}
                                      disabled={isStreaming}
                                      onClick={() => setCopyTarget({ key: row.key, size: row.size })}
                                    />
                                  )}
                                  {canMoveObject && (
                                    <PopupMenuItem
                                      label={t`Move/Rename Object`}
                                      disabled={isStreaming}
                                      onClick={() => setMoveTarget({ key: row.key, size: row.size })}
                                    />
                                  )}
                                  {canUpdateObject && (
                                    <PopupMenuItem
                                      label={t`Edit Object Metadata`}
                                      disabled={isStreaming}
                                      onClick={() => setEditMetadataTarget(row.key)}
                                    />
                                  )}
                                  {canShareObject && (
                                    <PopupMenuItem
                                      label={t`Share Object URL`}
                                      disabled={row.kind !== "object" || isStreaming}
                                      onClick={
                                        row.kind === "object"
                                          ? () => setPresignedUrlTarget({ key: row.key })
                                          : undefined
                                      }
                                      data-testid={`share-url-action-${row.key}`}
                                    />
                                  )}
                                  {canDeleteObject && (
                                    <PopupMenuItem
                                      label={t`Delete Object`}
                                      disabled={isStreaming}
                                      onClick={() =>
                                        setDeleteTarget({
                                          key: row.key,
                                          size: row.size,
                                          lastModified: row.lastModified,
                                        })
                                      }
                                    />
                                  )}
                                </>
                              )}
                            </PopupMenuOptions>
                          </PopupMenu>
                        )
                      })()}
                    </div>
                  </DataGridCell>
                </DataGridRow>
              )
            })}
          </DataGrid>
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

      <DeleteVersionModal
        bucketName={bucketName}
        objectKey={deleteVersionTarget?.key ?? ""}
        versionId={deleteVersionTarget?.versionId ?? ""}
        versionSize={deleteVersionTarget?.size}
        versionDate={deleteVersionTarget?.lastModified}
        isDeleteMarker={deleteVersionTarget?.isDeleteMarker ?? false}
        folderMarkerVersionId={deleteVersionTarget?.folderMarkerVersionId}
        allVersionIds={deleteVersionTarget?.allVersionIds}
        isOpen={deleteVersionTarget !== null}
        onClose={() => setDeleteVersionTarget(null)}
        onSuccess={(key, versionId) => {
          setDeleteVersionTarget(null)
          onDeleteVersion?.(key, versionId)
        }}
        onError={() => {
          setDeleteVersionTarget(null)
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

      <GeneratePresignedUrlModal
        bucketName={bucketName}
        objectKey={presignedUrlTarget?.key ?? null}
        isOpen={presignedUrlTarget !== null}
        onClose={() => setPresignedUrlTarget(null)}
        onCopySuccess={(objectKey) => {
          const { message, ...options } = getPresignedUrlCopiedToast(objectKey)
          toast.success(message, options)
        }}
      />

      <ObjectVersionHistoryModal
        isOpen={versionHistoryTarget !== null}
        bucketName={bucketName}
        objectKey={versionHistoryTarget ?? ""}
        onClose={() => setVersionHistoryTarget(null)}
        onRestoreVersion={onRestoreVersion}
        onDeleteVersion={onDeleteVersion}
        canRestoreVersion={canRestoreVersion}
        canDeleteVersion={canDeleteVersion}
      />
    </>
  )
}

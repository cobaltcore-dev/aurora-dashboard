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
  const [downloadingRow, setDownloadingRow] = useState<ObjectRow | null>(null)
  const [downloadId, setDownloadId] = useState<string | null>(null)

  // Live download progress for the in-flight download (drives the per-row bar).
  const { data: downloadProgress } = trpcReact.storage.ceph.objects.watchDownloadProgress.useSubscription(
    { project_id: projectId, downloadId: downloadId ?? "" },
    { enabled: !!downloadId && downloadingRow !== null }
  )

  // Stream the object from the BFF and assemble a Blob. downloadId is set before
  // the mutation starts so the watchDownloadProgress subscription is active from
  // the very first byte. Chunks arrive base64-encoded (JSON/SSE transport).
  const streamObjectToBlob = async (
    row: ObjectRow,
    activeDownloadId: string
  ): Promise<{ blob: Blob; filename: string }> => {
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

    return { blob: new Blob(chunks, { type: contentType }), filename }
  }

  // Trigger a browser file-save for the blob URL, then revoke it shortly after
  // to avoid racing the browser starting the download.
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
    const activeDownloadId = `${bucketName}:${row.key}:${crypto.randomUUID()}`
    setDownloadingRow(row)
    setDownloadId(activeDownloadId)
    try {
      const { blob, filename } = await streamObjectToBlob(row, activeDownloadId)
      triggerAnchorDownload(URL.createObjectURL(blob), filename)
    } catch (err) {
      onDownloadError(row.key, err instanceof Error ? err.message : String(err))
    } finally {
      if (isMounted.current) {
        setDownloadingRow(null)
        setDownloadId(null)
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
              const isDownloading = row.kind === "object" && downloadingRow?.key === row.key

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
                        <MdDescription size={18} className="text-theme-light shrink-0" />
                        <span className="truncate text-sm">{row.displayName}</span>
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
                    {isDownloading ? (
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-theme-light flex items-center gap-2 text-sm">
                          <Spinner size="small" />
                          {downloadProgress?.percent != null ? (
                            <Trans>{downloadProgress.percent}%</Trans>
                          ) : (
                            <Trans>Downloading...</Trans>
                          )}
                        </span>
                        {downloadProgress?.percent != null && (
                          <div className="bg-theme-background-lvl-2 h-1 w-full overflow-hidden rounded-full">
                            <div
                              className="bg-theme-accent h-1 rounded-full transition-all duration-150"
                              style={{ width: `${downloadProgress.percent}%` }}
                            />
                          </div>
                        )}
                      </span>
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
                                  disabled={isDownloading}
                                  onClick={() => handleDownload(row as ObjectRow)}
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
                                  label={t`Move`}
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

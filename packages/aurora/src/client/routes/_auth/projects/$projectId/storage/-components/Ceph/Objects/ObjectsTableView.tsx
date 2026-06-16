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
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { MdFolder, MdDescription } from "react-icons/md"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/ceph"
import { DeleteObjectModal } from "./DeleteObjectModal"
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
type CephRow = FolderRow | ObjectRow

// Define column template — 4 columns: name | size | last modified | actions
const GRID_COLUMN_TEMPLATE = "minmax(200px, 3fr) minmax(100px, 1fr) minmax(180px, 2fr) 60px"

interface ObjectsTableViewProps {
  bucketName: string
  objects: S3Object[]
  folders: S3FolderPrefix[]
  currentPrefix: string
  versioningEnabled?: boolean
  onFolderClick: (prefix: string) => void
  onDeleteObjectSuccess: (objectKey: string) => void
  onDeleteObjectError: (objectKey: string, errorMessage: string) => void
  onCopyObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string, wasOverwritten: boolean) => void
  onCopyObjectError: (objectKey: string, errorMessage: string) => void
  onMoveObjectSuccess: (objectKey: string, targetBucket: string, targetKey: string) => void
  onMoveObjectError: (objectKey: string, errorMessage: string) => void
  onEditMetadataSuccess: (objectKey: string) => void
  onEditMetadataError: (objectKey: string, errorMessage: string) => void
  onRestoreVersion?: (objectKey: string, versionId: string) => void
  onDeleteVersion?: (objectKey: string, versionId: string) => void
}

export function ObjectsTableView({
  bucketName,
  objects,
  folders,
  currentPrefix,
  versioningEnabled = false,
  onFolderClick,
  onDeleteObjectSuccess,
  onDeleteObjectError,
  onCopyObjectSuccess,
  onCopyObjectError,
  onMoveObjectSuccess,
  onMoveObjectError,
  onEditMetadataSuccess,
  onEditMetadataError,
  onRestoreVersion,
  onDeleteVersion,
}: ObjectsTableViewProps) {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string
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

  // Strip current prefix from display names
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  // Build combined rows — folders first, then objects
  const rows: CephRow[] = [
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
          style={{ height: "calc(100vh - 490px)" }}
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

              return (
                <div
                  key={isFolder ? row.prefix : row.key}
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
                      </div>
                    )}
                  </DataGridCell>

                  {/* Size */}
                  <DataGridCell>
                    <span className="text-sm">{isFolder ? "—" : formatBytesBinary(row.size)}</span>
                  </DataGridCell>

                  {/* Last Modified */}
                  <DataGridCell>
                    <span className="text-sm">
                      {!isFolder && row.lastModified ? new Date(row.lastModified).toLocaleString() : "—"}
                    </span>
                  </DataGridCell>

                  {/* Actions */}
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <PopupMenu>
                        <PopupMenuOptions>
                          {isFolder ? (
                            <PopupMenuItem label={t`Delete`} onClick={() => setDeleteTarget({ key: row.prefix })} />
                          ) : (
                            <>
                              {versioningEnabled && (
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
                              <PopupMenuItem label={t`Edit Metadata`} onClick={() => setEditMetadataTarget(row.key)} />
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
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onSuccess={onDeleteObjectSuccess}
        onError={onDeleteObjectError}
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

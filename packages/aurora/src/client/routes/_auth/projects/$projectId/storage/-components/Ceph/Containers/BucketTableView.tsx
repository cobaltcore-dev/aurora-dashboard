import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  Checkbox,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { Bucket } from "@/server/Storage/types/ceph"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { CreateBucketModal } from "./CreateBucketModal"
import { EmptyBucketModal } from "./EmptyBucketModal"
import { DeleteBucketModal } from "./DeleteBucketModal"

interface BucketTableViewProps {
  buckets: Bucket[]
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  onCreateSuccess: (bucketName: string) => void
  onCreateError: (bucketName: string, errorMessage: string) => void
  onEmptySuccess: (bucketName: string, deletedCount: number) => void
  onEmptyError: (bucketName: string, errorMessage: string) => void
  onDeleteSuccess: (bucketName: string) => void
  onDeleteError: (bucketName: string, errorMessage: string) => void
  selectedBuckets: string[]
  setSelectedBuckets: (buckets: string[]) => void
  // When false, the selection column (header select-all + per-row checkboxes) is dropped.
  hasAnyBulkAction?: boolean
}

export const BucketTableView = ({
  buckets,
  createModalOpen,
  setCreateModalOpen,
  onCreateSuccess,
  onCreateError,
  onEmptySuccess,
  onEmptyError,
  onDeleteSuccess,
  onDeleteError,
  selectedBuckets,
  setSelectedBuckets,
  hasAnyBulkAction = true,
}: BucketTableViewProps) => {
  const { projectId, provider, storageType } = useParams({ strict: false })
  const { t } = useLingui()
  const navigate = useNavigate()

  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [emptyModalBucket, setEmptyModalBucket] = useState<Bucket | null>(null)
  const [deleteModalBucket, setDeleteModalBucket] = useState<Bucket | null>(null)

  // Calculate scrollbar width
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [buckets.length])

  // Format date to localized string
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return t`N/A`
    }
  }

  const rowVirtualizer = useVirtualizer({
    count: buckets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 10,
  })

  const selectedSet = new Set(selectedBuckets)
  const allSelected = buckets.length > 0 && buckets.every((c) => selectedSet.has(c.name))

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedBuckets([])
    } else {
      setSelectedBuckets(buckets.map((c) => c.name))
    }
  }

  const handleSelectBucket = (containerName: string) => {
    if (selectedBuckets.includes(containerName)) {
      setSelectedBuckets(selectedBuckets.filter((name) => name !== containerName))
    } else {
      setSelectedBuckets([...selectedBuckets, containerName])
    }
  }

  if (!buckets || buckets.length === 0) {
    return (
      <DataGrid columns={4} className="buckets" data-testid="no-buckets">
        <DataGridRow>
          <DataGridCell colSpan={4}>
            <div className="py-8 text-center">
              <h3 className="text-lg font-semibold">
                <Trans>No buckets found</Trans>
              </h3>
              <p className="text-theme-light mt-2">
                <Trans>
                  There are no buckets available with the current search criteria. Try adjusting your search term.
                </Trans>
              </p>
            </div>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  // Column template — drops the leading 40px selection track when bulk actions are unavailable.
  // The header and the absolutely-positioned virtual rows must share an identical track string.
  const columnCount = hasAnyBulkAction ? 6 : 5
  const gridColumnTemplate = hasAnyBulkAction
    ? "40px minmax(200px, 2fr) minmax(100px, 1fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"
    : "minmax(200px, 2fr) minmax(100px, 1fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={columnCount}
            gridColumnTemplate={gridColumnTemplate}
            className="buckets"
            data-testid="buckets-table-header"
          >
            <DataGridRow>
              {hasAnyBulkAction && (
                <DataGridHeadCell>
                  <Checkbox checked={allSelected} onChange={handleSelectAll} data-testid="select-all-buckets" />
                </DataGridHeadCell>
              )}
              <DataGridHeadCell>
                <Trans>Bucket Name</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Object Count</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Last Modified</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell>
                <Trans>Total Size</Trans>
              </DataGridHeadCell>
              <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }} />
            </DataGridRow>
          </DataGrid>
        </div>

        {/* Virtualized Table Body with dynamic height */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{
            height: "calc(100vh - 490px)", // Dynamic height based on viewport
          }}
          data-testid="buckets-table-body"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const bucket = buckets[virtualRow.index]
              const isSelected = selectedBuckets.includes(bucket.name)

              const handleRowNavigate = () =>
                navigate({
                  to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
                  params: {
                    projectId: projectId ?? "",
                    provider: (provider as string) ?? "ceph",
                    storageType: (storageType as string) ?? "buckets",
                    containerName: bucket.name,
                  },
                })

              return (
                <div
                  key={bucket.name}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="juno-datagrid group hover:bg-theme-background-lvl-1 cursor-pointer"
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
                  data-testid={`bucket-row-${bucket.name}`}
                  role="link"
                  tabIndex={0}
                  onClick={handleRowNavigate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleRowNavigate()
                    }
                  }}
                >
                  {hasAnyBulkAction && (
                    <DataGridCell
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation()
                        }
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectBucket(bucket.name)}
                        data-testid={`select-bucket-${bucket.name}`}
                      />
                    </DataGridCell>
                  )}
                  <DataGridCell className="min-w-0 overflow-hidden">
                    <span className="block truncate" title={bucket.name}>
                      {bucket.name}
                    </span>
                  </DataGridCell>
                  <DataGridCell>{bucket.count.toLocaleString()}</DataGridCell>
                  <DataGridCell>{formatDate(bucket.last_modified || bucket.creationDate || "")}</DataGridCell>
                  <DataGridCell>{formatBytesBinary(bucket.bytes)}</DataGridCell>
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <PopupMenu>
                      <PopupMenuOptions>
                        <PopupMenuItem
                          label={t`Empty`}
                          onClick={() => setEmptyModalBucket(bucket)}
                          data-testid={`empty-action-${bucket.name}`}
                        />
                        <PopupMenuItem
                          label={t`Delete`}
                          onClick={() => setDeleteModalBucket(bucket)}
                          data-testid={`delete-action-${bucket.name}`}
                        />
                      </PopupMenuOptions>
                    </PopupMenu>
                  </DataGridCell>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <CreateBucketModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={onCreateSuccess}
        onError={onCreateError}
      />

      <EmptyBucketModal
        isOpen={emptyModalBucket !== null}
        bucket={emptyModalBucket}
        onClose={() => setEmptyModalBucket(null)}
        onSuccess={onEmptySuccess}
        onError={onEmptyError}
      />

      <DeleteBucketModal
        isOpen={deleteModalBucket !== null}
        bucket={deleteModalBucket}
        onClose={() => setDeleteModalBucket(null)}
        onSuccess={onDeleteSuccess}
        onError={onDeleteError}
      />
    </>
  )
}

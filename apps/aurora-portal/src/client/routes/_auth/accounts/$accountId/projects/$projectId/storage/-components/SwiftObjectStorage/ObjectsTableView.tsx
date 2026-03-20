import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Icon } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { BrowserRow } from "./ObjectList"

// Define column template — 3 columns: name | last modified | size
const GRID_COLUMN_TEMPLATE = "minmax(200px, 3fr) minmax(180px, 2fr) minmax(100px, 1fr)"

interface ObjectsTableViewProps {
  rows: BrowserRow[]
  searchTerm: string
  onFolderClick: (prefix: string) => void
}

export const ObjectsTableView = ({ rows, searchTerm, onFolderClick }: ObjectsTableViewProps) => {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

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
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return t`N/A`
    }
  }

  if (rows.length === 0) {
    return (
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
    )
  }

  const allCount = rows.length
  const visibleCount = rowVirtualizer.getVirtualItems().length

  return (
    <div className="relative">
      {/* Table Header with scrollbar padding */}
      <div style={{ paddingRight: `${scrollbarWidth}px` }}>
        <DataGrid
          columns={3}
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
            <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }}>
              <Trans>Size</Trans>
            </DataGridHeadCell>
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
                      className="flex min-w-0 items-center gap-2 text-left hover:underline focus:outline-none"
                      onClick={() => onFolderClick(row.name)}
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

      {/* Footer with count */}
      <div className="text-theme-light border-theme-background-lvl-2 border-t px-4 py-2 text-sm">
        <Trans>
          Showing {visibleCount} of {allCount} items
        </Trans>
      </div>
    </div>
  )
}

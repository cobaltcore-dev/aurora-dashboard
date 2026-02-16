import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { ContainerSummary } from "@/server/Storage/types/swift"

interface ContainerListViewProps {
  containers: ContainerSummary[]
}

export const ContainerListView = ({ containers }: ContainerListViewProps) => {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  // Calculate scrollbar width
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [containers.length])

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

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
    count: containers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 10,
  })

  if (!containers || containers.length === 0) {
    return (
      <DataGrid columns={4} className="containers" data-testid="no-containers">
        <DataGridRow>
          <DataGridCell colSpan={4}>
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold">
                <Trans>No containers found</Trans>
              </h3>
              <p className="text-theme-light mt-2">
                <Trans>
                  There are no containers available with the current search criteria. Try adjusting your search term.
                </Trans>
              </p>
            </div>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  // Define column template
  const gridColumnTemplate = "minmax(200px, 2fr) minmax(100px, 1fr) minmax(180px, 2fr) minmax(100px, 1fr)"

  return (
    <div className="relative">
      {/* Table Header with scrollbar padding */}
      <div style={{ paddingRight: `${scrollbarWidth}px` }}>
        <DataGrid
          columns={4}
          gridColumnTemplate={gridColumnTemplate}
          className="containers"
          data-testid="containers-table-header"
        >
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Container Name</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Object Count</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Last Modified</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell style={{ marginRight: `-${scrollbarWidth}px` }}>
              <Trans>Total Size</Trans>
            </DataGridHeadCell>
          </DataGridRow>
        </DataGrid>
      </div>

      {/* Virtualized Table Body with dynamic height */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{
          height: "calc(100vh - 360px)", // Dynamic height based on viewport
          // minHeight: "400px", // Minimum height for usability
          // maxHeight: "800px", // Maximum height to prevent overflow
        }}
        data-testid="containers-table-body"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const container = containers[virtualRow.index]
            return (
              <div
                key={container.name}
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
                data-testid={`container-row-${container.name}`}
              >
                <DataGridCell>{container.name}</DataGridCell>
                <DataGridCell>{container.count.toLocaleString()}</DataGridCell>
                <DataGridCell>{formatDate(container.last_modified)}</DataGridCell>
                <DataGridCell>{formatBytes(container.bytes)}</DataGridCell>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="py-2 px-4 text-sm text-theme-light border-t border-theme-background-lvl-2">
        <Trans>
          Showing {rowVirtualizer.getVirtualItems().length} of {containers.length} containers
        </Trans>
      </div>
    </div>
  )
}

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
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { CreateContainerModal } from "./CreateContainerModal"
import { getContainerCreatedToast, getContainerCreateErrorToast } from "./ContainerToastNotifications"

interface ContainerListViewProps {
  containers: ContainerSummary[]
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  maxContainerNameLength?: number
}

export const ContainerListView = ({
  containers,
  createModalOpen,
  setCreateModalOpen,
  maxContainerNameLength,
}: ContainerListViewProps) => {
  const { t } = useLingui()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

  const handleCreateSuccess = (containerName: string) => {
    setToastData(getContainerCreatedToast(containerName, { onDismiss: handleToastDismiss }))
  }

  const handleCreateError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerCreateErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  // Calculate scrollbar width
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.offsetWidth - parentRef.current.clientWidth
      setScrollbarWidth(width)
    }
  }, [containers.length])

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
            <div className="py-8 text-center">
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

  // Define column template: 4 data columns + fixed 60px actions column
  const gridColumnTemplate = "minmax(200px, 2fr) minmax(100px, 1fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"

  const allContainersCount = containers.length
  const virtualizedContainersCount = rowVirtualizer.getVirtualItems().length

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={5}
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
            height: "calc(100vh - 425px)", // Dynamic height based on viewport
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
                  <DataGridCell>{container.last_modified ? formatDate(container.last_modified) : t`N/A`}</DataGridCell>
                  <DataGridCell>{formatBytesBinary(container.bytes)}</DataGridCell>
                  <DataGridCell>
                    <PopupMenu>
                      <PopupMenuOptions>
                        <PopupMenuItem label={t`Empty`} onClick={() => {}} />
                        <PopupMenuItem label={t`Delete`} onClick={() => {}} />
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
          <Trans>
            Showing {virtualizedContainersCount} of {allContainersCount} containers
          </Trans>
        </div>
      </div>

      <CreateContainerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
        maxContainerNameLength={maxContainerNameLength}
      />

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </>
  )
}

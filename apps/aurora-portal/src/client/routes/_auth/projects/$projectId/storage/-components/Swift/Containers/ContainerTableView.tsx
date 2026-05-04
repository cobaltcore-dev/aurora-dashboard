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
import { ContainerSummary } from "@/server/Storage/types/swift"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { CreateContainerModal } from "./CreateContainerModal"
import { EmptyContainerModal } from "./EmptyContainerModal"
import { DeleteContainerModal } from "./DeleteContainerModal"
import { EditContainerMetadataModal } from "./EditContainerMetadataModal"
import { ManageContainerAccessModal } from "./ManageContainerAccessModal"

interface ContainerTableViewProps {
  containers: ContainerSummary[]
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  maxContainerNameLength?: number
  onCreateSuccess: (containerName: string) => void
  onCreateError: (containerName: string, errorMessage: string) => void
  onEmptySuccess: (containerName: string, deletedCount: number) => void
  onEmptyError: (containerName: string, errorMessage: string) => void
  onDeleteSuccess: (containerName: string) => void
  onDeleteError: (containerName: string, errorMessage: string) => void
  onPropertiesSuccess: (containerName: string) => void
  onPropertiesError: (containerName: string, errorMessage: string) => void
  onAclSuccess: (containerName: string) => void
  onAclError: (containerName: string, errorMessage: string) => void
  selectedContainers: string[]
  setSelectedContainers: (containers: string[]) => void
}

export const ContainerTableView = ({
  containers,
  createModalOpen,
  setCreateModalOpen,
  maxContainerNameLength,
  onCreateSuccess,
  onCreateError,
  onEmptySuccess,
  onEmptyError,
  onDeleteSuccess,
  onDeleteError,
  onPropertiesSuccess,
  onPropertiesError,
  onAclSuccess,
  onAclError,
  selectedContainers,
  setSelectedContainers,
}: ContainerTableViewProps) => {
  const { projectId, provider } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/containers/",
  })

  const { t } = useLingui()
  const navigate = useNavigate()

  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [emptyModalContainer, setEmptyModalContainer] = useState<ContainerSummary | null>(null)
  const [deleteModalContainer, setDeleteModalContainer] = useState<ContainerSummary | null>(null)
  const [propertiesModalContainer, setPropertiesModalContainer] = useState<ContainerSummary | null>(null)
  const [accessControlModalContainer, setAccessControlModalContainer] = useState<ContainerSummary | null>(null)

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

  const allSelected = containers.length > 0 && selectedContainers.length === containers.length

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedContainers([])
    } else {
      setSelectedContainers(containers.map((c) => c.name))
    }
  }

  const handleSelectContainer = (containerName: string) => {
    if (selectedContainers.includes(containerName)) {
      setSelectedContainers(selectedContainers.filter((name) => name !== containerName))
    } else {
      setSelectedContainers([...selectedContainers, containerName])
    }
  }

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

  // Define column template — 6 columns: checkbox, name, count, last modified, size, actions menu
  const gridColumnTemplate = "40px minmax(200px, 2fr) minmax(100px, 1fr) minmax(180px, 2fr) minmax(100px, 1fr) 60px"

  const allContainersCount = containers.length

  return (
    <>
      <div className="relative">
        {/* Table Header with scrollbar padding */}
        <div style={{ paddingRight: `${scrollbarWidth}px` }}>
          <DataGrid
            columns={6}
            gridColumnTemplate={gridColumnTemplate}
            className="containers"
            data-testid="containers-table-header"
          >
            <DataGridRow>
              <DataGridHeadCell>
                <Checkbox checked={allSelected} onChange={handleSelectAll} data-testid="select-all-containers" />
              </DataGridHeadCell>
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
            height: "calc(100vh - 545px)", // Dynamic height based on viewport
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
              const isSelected = selectedContainers.includes(container.name)

              const handleRowNavigate = () =>
                navigate({
                  to: "/projects/$projectId/storage/$provider/containers/$containerName/objects",
                  params: { projectId, provider, containerName: container.name },
                })

              return (
                <div
                  key={container.name}
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
                  data-testid={`container-row-${container.name}`}
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
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectContainer(container.name)}
                      data-testid={`select-container-${container.name}`}
                    />
                  </DataGridCell>
                  <DataGridCell className="min-w-0 overflow-hidden">
                    <span className="block truncate" title={container.name}>
                      {container.name}
                    </span>
                  </DataGridCell>
                  <DataGridCell>{container.count.toLocaleString()}</DataGridCell>
                  <DataGridCell>{container.last_modified ? formatDate(container.last_modified) : t`N/A`}</DataGridCell>
                  <DataGridCell>{formatBytesBinary(container.bytes)}</DataGridCell>
                  <DataGridCell onClick={(e) => e.stopPropagation()}>
                    <PopupMenu>
                      <PopupMenuOptions>
                        <PopupMenuItem
                          label={t`Manage Access`}
                          onClick={() => setAccessControlModalContainer(container)}
                          data-testid={`access-control-action-${container.name}`}
                        />
                        <PopupMenuItem
                          label={t`Edit Metadata`}
                          onClick={() => setPropertiesModalContainer(container)}
                          data-testid={`properties-action-${container.name}`}
                        />
                        <PopupMenuItem
                          label={t`Empty`}
                          onClick={() => setEmptyModalContainer(container)}
                          data-testid={`empty-action-${container.name}`}
                        />
                        <PopupMenuItem
                          label={t`Delete`}
                          onClick={() => setDeleteModalContainer(container)}
                          data-testid={`delete-action-${container.name}`}
                        />
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
          {allContainersCount === 1 ? (
            <Trans>{allContainersCount} container</Trans>
          ) : (
            <Trans>{allContainersCount} containers</Trans>
          )}
        </div>
      </div>

      <CreateContainerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={onCreateSuccess}
        onError={onCreateError}
        maxContainerNameLength={maxContainerNameLength}
      />

      <EmptyContainerModal
        isOpen={emptyModalContainer !== null}
        container={emptyModalContainer}
        onClose={() => setEmptyModalContainer(null)}
        onSuccess={onEmptySuccess}
        onError={onEmptyError}
      />

      <DeleteContainerModal
        isOpen={deleteModalContainer !== null}
        container={deleteModalContainer}
        onClose={() => setDeleteModalContainer(null)}
        onSuccess={onDeleteSuccess}
        onError={onDeleteError}
      />

      <EditContainerMetadataModal
        isOpen={propertiesModalContainer !== null}
        container={propertiesModalContainer}
        onClose={() => setPropertiesModalContainer(null)}
        onSuccess={onPropertiesSuccess}
        onError={onPropertiesError}
      />

      <ManageContainerAccessModal
        isOpen={accessControlModalContainer !== null}
        container={accessControlModalContainer}
        onClose={() => setAccessControlModalContainer(null)}
        onSuccess={onAclSuccess}
        onError={onAclError}
      />
    </>
  )
}

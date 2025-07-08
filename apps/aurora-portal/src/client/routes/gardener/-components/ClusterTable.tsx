import React from "react"
import ClusterTableRow from "./ClusterTableRow"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Cluster } from "@/server/Gardener/types/cluster"
import { GardenerButton } from "./ui/GardenerButton"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  Icon,
  DataGridCell,
  Stack,
} from "@cloudoperators/juno-ui-components/index"
// Inner table component for consistent styling
export const ClusterTable: React.FC<{
  clusters: Cluster[]
  filteredCount: number
  setDeleteClusterModal: (clusterName: string) => void
}> = ({ clusters, filteredCount, setDeleteClusterModal }) => {
  return (
    <div className="w-full">
      {/* Table with enhanced styling */}
      <DataGrid columns={7} minContentColumns={[0]} cellVerticalAlignment="top" className="alerts">
        {clusters.length === 0 ? (
          <DataGridRow className="no-hover">
            <DataGridCell colSpan={7}>
              <Stack gap="3">
                <Icon icon="info" color="text-theme-info" />
                <div>
                  <h3>No clusters found</h3>
                  <p>No Kubernetes clusters match your current filter criteria</p>
                </div>
              </Stack>
            </DataGridCell>
          </DataGridRow>
        ) : (
          <>
            <DataGridRow>
              <DataGridHeadCell>
                <Icon icon="monitorHeart" />
              </DataGridHeadCell>
              <DataGridHeadCell>Status</DataGridHeadCell>
              <DataGridHeadCell>Name</DataGridHeadCell>
              <DataGridHeadCell>Region</DataGridHeadCell>
              <DataGridHeadCell>Infrastructure</DataGridHeadCell>
              <DataGridHeadCell>Version</DataGridHeadCell>
              <DataGridHeadCell className="text-right">Actions</DataGridHeadCell>
            </DataGridRow>

            {clusters.map((cluster, index) => (
              <ClusterTableRow
                key={cluster.uid}
                cluster={cluster}
                isLast={index === clusters.length - 1}
                setShowClusterModal={setDeleteClusterModal}
              />
            ))}
          </>
        )}
      </DataGrid>

      {/* Footer with pagination or summary */}
      {clusters.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-aurora-gray-400 text-sm">
          <div>
            Showing <span className="text-aurora-white">{clusters.length}</span> of{" "}
            <span className="text-aurora-white">{filteredCount}</span> clusters
          </div>
          <div className="flex items-center gap-2">
            <GardenerButton size="sm" variant="disabled" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </GardenerButton>
            <span className="px-3 py-1 bg-aurora-gray-900/50 text-aurora-gray-600 rounded cursor-not-allowed">1</span>
            <GardenerButton size="sm" variant="disabled" disabled>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </GardenerButton>
          </div>
        </div>
      )}
    </div>
  )
}

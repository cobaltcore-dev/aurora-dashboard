import React from "react"
import ClusterTableRow from "./ClusterTableRow"
import { Cluster } from "@/server/Gardener/types/cluster"
import { DataGrid, DataGridHeadCell, DataGridRow, Icon, DataGridCell, Stack } from "@cloudoperators/juno-ui-components"
// Inner table component for consistent styling
export const ClusterTable: React.FC<{
  clusters: Cluster[]
  filteredCount: number
}> = ({ clusters, filteredCount }) => {
  return (
    <div className="w-full">
      {/* Header with summary */}
      <Stack className="bg-theme-background-lvl-1 py-2 px-4 my-0">
        <Stack gap="1" className="w-1/2">
          <span className="text-theme-high">{clusters.length}</span> out of{" "}
          <span className="text-theme-high">{filteredCount}</span> clusters
        </Stack>
        <Stack distribution="end" gap="1" className="w-1/2">
          Last Update{" "}
          <span className="text-theme-high">
            {clusters
              .filter((cluster) => cluster.stateDetails?.lastTransitionTime)
              .map((cluster) => new Date(cluster.stateDetails?.lastTransitionTime as string))
              .sort((a, b) => b.getTime() - a.getTime())[0]
              .toUTCString()}
          </span>
        </Stack>
      </Stack>
      {/* Table with enhanced styling */}
      <DataGrid columns={8} minContentColumns={[0]} cellVerticalAlignment="top" className="alerts">
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
              <DataGridHeadCell>Readiness</DataGridHeadCell>
              <DataGridHeadCell>Name</DataGridHeadCell>
              <DataGridHeadCell>Purpose</DataGridHeadCell>
              <DataGridHeadCell>Infrastructure</DataGridHeadCell>
              <DataGridHeadCell colSpan={2}>Version</DataGridHeadCell>
            </DataGridRow>

            {clusters.map((cluster) => (
              <ClusterTableRow key={cluster.uid} cluster={cluster} />
            ))}
          </>
        )}
      </DataGrid>
    </div>
  )
}

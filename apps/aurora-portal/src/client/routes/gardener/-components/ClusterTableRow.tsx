import React from "react"
import { Link } from "@tanstack/react-router"
import { Cluster } from "@/server/Gardener/types/cluster"
import { toast } from "sonner"
import { DataGridRow, DataGridCell, Icon, ButtonRow, Stack } from "@cloudoperators/juno-ui-components/index"

interface ClusterTableRowProps {
  cluster: Cluster
  isLast: boolean
  setShowClusterModal: (clusterName: string) => void
}

// Helper function to get status indicator color and shadow
const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "operational":
    case "running":
      return {
        color: "text-theme-success",
        icon: "success" as const,
      }
    case "warning":
    case "pending":
      return {
        color: "text-theme-warning",
        icon: "info" as const,
      }
    case "unhealthy":
    case "error":
    case "failed":
      return {
        color: "text-theme-danger",
        icon: "dangerous" as const,
      }
    default:
      return {
        color: "text-default",
        icon: "help" as const,
      }
  }
}

const ClusterTableRow: React.FC<ClusterTableRowProps> = ({ cluster, setShowClusterModal }) => {
  const statusStyles = getStatusStyles(cluster.status)

  // Function to handle copy of cluster ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(cluster.uid)
    toast.success("Cluster ID copied to clipboard")
  }

  return (
    <DataGridRow>
      <DataGridCell>
        <Icon color={statusStyles.color} icon={statusStyles.icon} />
      </DataGridCell>

      <DataGridCell>{cluster.status}</DataGridCell>
      <DataGridCell>
        <Stack direction="vertical">
          <Link
            to="/gardener/clusters/$clusterName"
            params={{ clusterName: cluster.name }}
            className="text-theme-default hover:text-theme-link"
          >
            {cluster.name}
          </Link>
          <p className="text-theme-light hover:text-theme-default" onClick={handleCopyId} title="Click to copy ID">
            ID: {cluster.uid.substring(0, 8)}...
          </p>
        </Stack>
      </DataGridCell>

      <DataGridCell>{cluster.region}</DataGridCell>

      <DataGridCell>{cluster.infrastructure}</DataGridCell>

      <DataGridCell>{cluster.version}</DataGridCell>

      {/* Action Buttons - Hidden until row hover */}
      <DataGridCell>
        <ButtonRow>
          <Link to="/gardener/clusters/$clusterName" params={{ clusterName: cluster.name }}>
            <Icon onClick={() => {}} icon="info" aria-label="View Details" />
          </Link>

          <Icon
            disabled
            onClick={() => {
              toast.info(`Editing ${cluster.name}... (Not implemented)`)
            }}
            icon="edit"
            aria-label="Edit Cluster"
          />

          <Icon
            onClick={() => {
              setShowClusterModal(cluster.name)
            }}
            icon="deleteForever"
            aria-label="Delete Cluster"
          />
        </ButtonRow>
      </DataGridCell>
    </DataGridRow>
  )
}

export default ClusterTableRow

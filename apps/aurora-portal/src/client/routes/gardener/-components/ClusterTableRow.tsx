import React from "react"
import { Link } from "@tanstack/react-router"
import { Cluster } from "@/server/Gardener/types/cluster"
import { toast } from "sonner"
import { DataGridRow, DataGridCell, Icon, Stack, Button, Badge } from "@cloudoperators/juno-ui-components"

interface ClusterTableRowProps {
  cluster: Cluster
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

const getReadinessConditionStyles = (condition: { type: string; status: string; displayValue: string }) => {
  switch (condition.status) {
    case "True":
      return {
        variant: "success" as const,
      }
    case "False":
      return {
        variant: "error" as const,
        icon: "error" as const,
      }
    default:
      return {
        variant: "warning" as const,
        icon: "warning" as const,
      }
  }
}

const renderReadinessConditions = (conditions: Array<{ type: string; status: string; displayValue: string }>) => {
  return conditions.map((condition) => {
    const conditionStyles = getReadinessConditionStyles(condition)

    return (
      <Badge
        key={condition.type}
        text={condition.displayValue}
        icon={conditionStyles.icon}
        variant={conditionStyles.variant}
      />
    )
  })
}

const ClusterTableRow: React.FC<ClusterTableRowProps> = ({ cluster }) => {
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
        <Stack gap="1">{renderReadinessConditions(cluster.readiness.conditions)}</Stack>
      </DataGridCell>
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

      <DataGridCell>{cluster.purpose}</DataGridCell>

      <DataGridCell>{cluster.infrastructure}</DataGridCell>

      <DataGridCell>
        <Stack gap="1">
          {cluster.lastMaintenance.state === "Error" ? <Icon icon="errorOutline" color="text-theme-error" /> : null}{" "}
          {cluster.version}
        </Stack>
      </DataGridCell>

      <DataGridCell>
        <Stack distribution="end">
          <Link to="/gardener/clusters/$clusterName" params={{ clusterName: cluster.name }}>
            <Button label="View Details" variant="primary" />
          </Link>
        </Stack>
      </DataGridCell>
    </DataGridRow>
  )
}

export default ClusterTableRow

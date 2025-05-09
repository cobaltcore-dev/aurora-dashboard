import React from "react"
import { IconButton } from "@/client/components/headless-ui/Button"
import { Eye, Edit, Trash2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Cluster } from "@/server/Gardener/types/cluster"
import { toast } from "sonner"

interface ClusterTableRowProps {
  cluster: Cluster
  isLast: boolean
}

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "healthy":
      return "text-aurora-green-500"
    case "warning":
      return "text-aurora-yellow-500"
    case "unhealthy":
      return "text-aurora-red-500"
    default:
      return "text-aurora-gray-500"
  }
}

// Helper function to get status indicator color
const getStatusIndicatorColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "healthy":
      return "bg-aurora-green-500"
    case "warning":
      return "bg-aurora-yellow-500"
    case "unhealthy":
      return "bg-aurora-red-500"
    default:
      return "bg-aurora-gray-500"
  }
}

const ClusterTableRow: React.FC<ClusterTableRowProps> = ({ cluster, isLast }) => {
  return (
    <tr className={`hover:bg-aurora-gray-800/50 transition-colors ${!isLast ? "border-b border-aurora-gray-800" : ""}`}>
      <td className="p-4 font-medium">
        <a
          href={`/gardener/clusters/${cluster.name}`}
          className="text-aurora-white hover:text-aurora-blue-400 transition-colors"
        >
          {cluster.name}
        </a>
      </td>
      <td className="p-4 capitalize">{cluster.infrastructure}</td>
      <td className="p-4">{cluster.region}</td>
      <td className="p-4">{cluster.version}</td>
      <td className="p-4">
        <div className="flex items-center">
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusIndicatorColor(cluster.status)} mr-2`}></div>
          <span className={getStatusColor(cluster.status)}>{cluster.status}</span>
        </div>
      </td>

      {/* Action Buttons */}
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          <Link to="/gardener/clusters/$clusterName" params={{ clusterName: cluster.name }}>
            <IconButton
              size="sm"
              variant="ghost"
              className="text-aurora-blue-500 hover:text-aurora-blue-400 hover:bg-aurora-blue-800/20"
              onClick={() => {}}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </IconButton>
          </Link>

          <IconButton
            size="sm"
            variant="ghost"
            className="text-aurora-gray-500 hover:text-aurora-gray-400 hover:bg-aurora-gray-700/40"
            onClick={() => {
              toast.info(`Editing ${cluster.name}... (Not implemented)`)
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </IconButton>

          <IconButton
            size="sm"
            variant="ghost"
            className="text-aurora-red-500 hover:text-aurora-red-400 hover:bg-aurora-red-800/20"
            onClick={() => {
              toast.info(`Deleting ${cluster.name}... (Not implemented)`)
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

export default ClusterTableRow

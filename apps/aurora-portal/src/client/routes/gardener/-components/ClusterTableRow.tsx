import React from "react"
import { Button } from "@/client/components/headless-ui/Button"
import { Eye, Edit, Trash2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { Cluster } from "@/server/Gardener/types/cluster"

interface ClusterTableRowProps {
  cluster: Cluster
  isLast: boolean
}

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "healthy":
      return "bg-green-500"
    case "warning":
      return "bg-yellow-500"
    case "unhealthy":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

const ClusterTableRow: React.FC<ClusterTableRowProps> = ({ cluster, isLast }) => {
  return (
    <tr className={`hover:bg-gray-900 transition-colors ${!isLast ? "border-b border-gray-800" : ""}`}>
      <td className="p-3 font-medium">{cluster.name}</td>
      <td className="p-3 capitalize">{cluster.infrastructure}</td>
      <td className="p-3">{cluster.region}</td>
      <td className="p-3">{cluster.version}</td>
      <td className="p-3">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(cluster.status)} mr-2`}></div>
          <span>{cluster.status}</span>
        </div>
      </td>

      {/* Action Buttons */}
      <td className="p-3">
        <div className="flex items-center justify-end gap-2">
          <Button className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/20">
            <Link to="/gardener/clusters/$clusterName" params={{ clusterName: cluster.name }}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </Link>
          </Button>

          <Button
            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/20"
            onClick={() => {
              toast.info(`Editing ${cluster.name}... (Not implemented)`)
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>

          <Button
            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/20"
            onClick={() => {
              toast.info(`Deleting ${cluster.name}... (Not implemented)`)
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default ClusterTableRow

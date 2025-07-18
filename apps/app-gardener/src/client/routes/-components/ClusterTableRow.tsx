import React from "react"
import { Eye, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Cluster } from "@/bff/types/cluster"
import { toast } from "sonner"
import { GardenerIconButton } from "./ui/GardenerButton"

interface ClusterTableRowProps {
  cluster: Cluster
  isLast: boolean
  setShowClusterModal: (clusterName: string) => void
}

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "operational":
      return "text-aurora-green-500"
    case "running":
      return "text-aurora-green-500"
    case "warning":
      return "text-aurora-yellow-500"
    case "pending":
      return "text-aurora-yellow-500"
    case "unhealthy":
      return "text-aurora-red-500"
    case "error":
      return "text-aurora-red-500"
    case "failed":
      return "text-aurora-red-500"
    default:
      return "text-aurora-gray-500"
  }
}

// Helper function to get status indicator color and shadow
const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "operational":
    case "running":
      return {
        bg: "bg-aurora-green-500",
        glow: "shadow-lg shadow-aurora-green-500/30",
        pulse: false,
        icon: CheckCircle,
      }
    case "warning":
    case "pending":
      return {
        bg: "bg-aurora-yellow-500",
        glow: "shadow-lg shadow-aurora-yellow-500/30",
        pulse: true,
        icon: Clock,
      }
    case "unhealthy":
    case "error":
    case "failed":
      return {
        bg: "bg-aurora-red-500",
        glow: "shadow-lg shadow-aurora-red-500/30",
        pulse: false,
        icon: XCircle,
      }
    default:
      return {
        bg: "bg-aurora-gray-500",
        glow: "shadow-md shadow-aurora-gray-500/20",
        pulse: false,
        icon: AlertTriangle,
      }
  }
}

const ClusterTableRow: React.FC<ClusterTableRowProps> = ({ cluster, isLast, setShowClusterModal }) => {
  const statusStyles = getStatusStyles(cluster.status)
  const StatusIcon = statusStyles.icon

  // Function to handle copy of cluster ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(cluster.uid)
    toast.success("Cluster ID copied to clipboard")
  }

  return (
    <tr
      className={`group hover:bg-aurora-gray-800/50 transition-colors ${!isLast ? "border-b border-aurora-gray-800" : ""}`}
    >
      <td className="p-4 font-medium">
        <div className="flex flex-col">
          <Link
            to="/clusters/$clusterName"
            params={{ clusterName: cluster.name }}
            className="text-aurora-white hover:text-aurora-blue-400 transition-colors"
          >
            {cluster.name}
          </Link>
          <div className="flex items-center mt-1">
            <div
              className="text-xs text-aurora-gray-500 hover:text-aurora-gray-300 cursor-pointer transition-colors"
              onClick={handleCopyId}
              title="Click to copy ID"
            >
              ID: {cluster.uid.substring(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center">
          <div className="rounded-md bg-aurora-gray-800 p-1 mr-2 border border-aurora-gray-700">
            <span className="uppercase text-xs font-mono text-aurora-blue-300">
              {cluster.infrastructure.substring(0, 3)}
            </span>
          </div>
          <span className="capitalize">{cluster.infrastructure}</span>
        </div>
      </td>
      <td className="p-4">
        <span className="px-2 py-1 rounded-md bg-aurora-gray-800/50 text-sm text-aurora-purple-300">
          {cluster.region}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center">
          <span className="text-aurora-blue-400">v</span>
          {cluster.version}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center">
          {/* Improved status indicator with better proportions */}
          <div
            className={`w-6 h-6 rounded-full ${statusStyles.bg} ${statusStyles.glow} flex items-center justify-center ${statusStyles.pulse ? "animate-pulse" : ""} mr-2`}
          >
            <StatusIcon className="h-4 w-4 text-white" />
          </div>
          <span className={`font-medium ${getStatusColor(cluster.status)}`}>{cluster.status}</span>
        </div>
      </td>

      {/* Action Buttons - Hidden until row hover */}
      <td className="p-4">
        <div className="flex items-center justify-end gap-2 group-hover:opacity-100 transition-opacity">
          <Link to="/clusters/$clusterName" params={{ clusterName: cluster.name }}>
            <GardenerIconButton
              size="sm"
              variant="ghost"
              className="text-aurora-blue-500 hover:text-aurora-blue-400 hover:bg-aurora-blue-800/20"
              onClick={() => {}}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </GardenerIconButton>
          </Link>

          <GardenerIconButton
            size="sm"
            disabled
            variant="disabled"
            onClick={() => {
              toast.info(`Editing ${cluster.name}... (Not implemented)`)
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </GardenerIconButton>

          <GardenerIconButton
            size="sm"
            variant="ghost"
            className="text-aurora-red-500 hover:text-aurora-red-400 hover:bg-aurora-red-800/20"
            onClick={() => {
              setShowClusterModal(cluster.name)
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </GardenerIconButton>
        </div>
      </td>
    </tr>
  )
}

export default ClusterTableRow

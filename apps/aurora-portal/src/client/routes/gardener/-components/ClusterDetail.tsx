import React from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Share2, Edit, RefreshCcw, Check, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react"
import {
  GardenerTable,
  GardenerTableBody,
  GardenerTableCell,
  GardenerTableHead,
  GardenerTableHeader,
  GardenerTableRow,
} from "./ui/GardenerTable"
import { Cluster } from "@/server/Gardener/types/cluster"
import { toast } from "sonner"
import { GardenerButton } from "./ui/GardenerButton"
import { GardenerCard, GardenerCardContent, GardenerCardHeader, GardenerCardTitle } from "./ui/GardenerCard"

// Component to render worker details
const WorkersSection: React.FC<{ workers: Cluster["workers"] }> = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
        <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
          <GardenerCardTitle className="text-xl font-medium">Workers</GardenerCardTitle>
          <GardenerButton size="sm" variant="secondary" className="opacity-50 cursor-not-allowed">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Add Worker
          </GardenerButton>
        </GardenerCardHeader>
        <GardenerCardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-aurora-gray-800/50 rounded-full p-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-aurora-gray-500" />
            </div>
            <p className="text-aurora-gray-400 mb-1">No worker nodes configured for this cluster.</p>
            <p className="text-sm text-aurora-gray-500">Add worker nodes to run your workloads</p>
          </div>
        </GardenerCardContent>
      </GardenerCard>
    )
  }

  return (
    <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
      <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
        <GardenerCardTitle className="text-xl font-medium">Workers</GardenerCardTitle>
        <GardenerButton
          size="sm"
          variant="secondary"
          className="hover:bg-aurora-blue-900/20 hover:text-aurora-blue-300 hover:border-aurora-blue-700"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Add Worker
        </GardenerButton>
      </GardenerCardHeader>
      <GardenerCardContent className="pt-4">
        <GardenerTable>
          <GardenerTableHeader className="bg-aurora-gray-800/80">
            <GardenerTableRow className="border-aurora-gray-700">
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Name
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Machine Type
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Image
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Scaling
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Zones
              </GardenerTableHead>
            </GardenerTableRow>
          </GardenerTableHeader>
          <GardenerTableBody>
            {workers.map((worker) => (
              <GardenerTableRow
                key={worker.name}
                className="border-aurora-gray-800 hover:bg-aurora-gray-800/30 transition-colors"
              >
                <GardenerTableCell className="font-medium text-aurora-white">
                  <div className="flex flex-col">
                    <span>{worker.name}</span>
                    <span className="text-xs text-aurora-gray-400 mt-1">{worker.architecture}</span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">{worker.machineType}</span>
                    <span className="text-xs text-aurora-blue-300 mt-1">{worker.containerRuntime}</span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">{worker.machineImage.name}</span>
                    <div className="flex items-center mt-1">
                      <span className="text-aurora-blue-400 text-xs">v</span>
                      <span className="text-xs text-aurora-gray-400">{worker.machineImage.version}</span>
                    </div>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">
                      {worker.actual !== undefined ? worker.actual : "?"} nodes
                    </span>
                    <span className="text-xs text-aurora-gray-400 mt-1">
                      Min: {worker.min} / Max: {worker.max} / Surge: {worker.maxSurge}
                    </span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.zones.map((zone) => (
                      <span
                        key={zone}
                        className="px-2 py-0.5 text-xs bg-aurora-gray-800 text-aurora-purple-300 rounded-md border border-aurora-gray-700"
                      >
                        {zone}
                      </span>
                    ))}
                  </div>
                </GardenerTableCell>
              </GardenerTableRow>
            ))}
          </GardenerTableBody>
        </GardenerTable>
      </GardenerCardContent>
    </GardenerCard>
  )
}

// Component to render maintenance & auto update settings
const SettingsSection: React.FC<{
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}> = ({ maintenance, autoUpdate }) => {
  return (
    <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
      <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
        <GardenerCardTitle className="text-xl font-medium">Settings</GardenerCardTitle>
        <GardenerButton
          size="sm"
          variant="secondary"
          className="hover:bg-aurora-blue-900/20 hover:text-aurora-blue-300 hover:border-aurora-blue-700"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Settings
        </GardenerButton>
      </GardenerCardHeader>
      <GardenerCardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-lg font-medium text-aurora-white">Maintenance Window</h3>
              <span className="ml-2 px-2 py-0.5 text-xs bg-aurora-orange-900/30 text-aurora-orange-300 rounded border border-aurora-orange-700/30">
                Scheduled
              </span>
            </div>
            <div className="bg-aurora-gray-800/50 rounded-md p-4 space-y-3 border border-aurora-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Start Time:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.startTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Window Time:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.windowTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Timezone:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.timezone}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-aurora-white mb-3">Auto Update</h3>
            <div className="bg-aurora-gray-800/50 rounded-md p-4 space-y-3 border border-aurora-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">OS Updates:</span>
                {autoUpdate.os ? (
                  <div className="flex items-center px-2 py-1 bg-aurora-green-900/20 text-aurora-green-400 rounded border border-aurora-green-700/30">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 bg-aurora-red-900/20 text-aurora-red-400 rounded border border-aurora-red-700/30">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Disabled</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Kubernetes Updates:</span>
                {autoUpdate.kubernetes ? (
                  <div className="flex items-center px-2 py-1 bg-aurora-green-900/20 text-aurora-green-400 rounded border border-aurora-green-700/30">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 bg-aurora-red-900/20 text-aurora-red-400 rounded border border-aurora-red-700/30">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Disabled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GardenerCardContent>
    </GardenerCard>
  )
}

// Helper function to get status styles
const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "healthy":
    case "operational":
      return {
        bg: "bg-aurora-green-500",
        glow: "shadow-lg shadow-aurora-green-500/30",
        text: "text-aurora-green-500",
        badgeBg: "bg-aurora-green-900/20",
        badgeBorder: "border-aurora-green-700/30",
        badgeText: "text-aurora-green-400",
        pulse: false,
        icon: <CheckCircle className="h-4 w-4 text-white" />,
      }
    case "warning":
    case "pending":
      return {
        bg: "bg-aurora-yellow-500",
        glow: "shadow-lg shadow-aurora-yellow-500/30",
        text: "text-aurora-yellow-500",
        badgeBg: "bg-aurora-yellow-900/20",
        badgeBorder: "border-aurora-yellow-700/30",
        badgeText: "text-aurora-yellow-400",
        pulse: true,
        icon: <Clock className="h-4 w-4 text-white" />,
      }
    case "unhealthy":
    case "error":
    case "failed":
      return {
        bg: "bg-aurora-red-500",
        glow: "shadow-lg shadow-aurora-red-500/30",
        text: "text-aurora-red-500",
        badgeBg: "bg-aurora-red-900/20",
        badgeBorder: "border-aurora-red-700/30",
        badgeText: "text-aurora-red-400",
        pulse: false,
        icon: <XCircle className="h-4 w-4 text-white" />,
      }
    default:
      return {
        bg: "bg-aurora-gray-500",
        glow: "shadow-md shadow-aurora-gray-500/20",
        text: "text-aurora-gray-500",
        badgeBg: "bg-aurora-gray-900/20",
        badgeBorder: "border-aurora-gray-700/30",
        badgeText: "text-aurora-gray-400",
        pulse: false,
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
      }
  }
}

interface ClusterDetailProps {
  cluster: Cluster
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster }) => {
  const statusStyles = getStatusStyles(cluster.status)

  // Function to handle sharing cluster info
  const handleShare = async () => {
    try {
      // Create a shareable URL or text about the cluster
      const clusterInfo = `Cluster: ${cluster.name}\nID: ${cluster.uid}\nProvider: ${cluster.infrastructure}\nRegion: ${cluster.region}\nStatus: ${cluster.status}\nVersion: ${cluster.version}`

      // Copy to clipboard
      await navigator.clipboard.writeText(clusterInfo)

      // Show success toast notification
      toast.success("Cluster details copied to clipboard!", {
        duration: 3000,
        icon: <Check className="h-4 w-4 text-aurora-green-500" />,
        description: "You can now share this information with your team",
        position: "top-right",
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Show error toast if clipboard write fails
      toast.error("Failed to copy to clipboard", {
        duration: 3000,
        description: "Please try again or copy manually",
        position: "top-right",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-aurora-gray-950 to-aurora-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back GardenerButton and title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <Link to="/gardener/clusters">
              <GardenerButton size="md" variant="secondary" className="mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Clusters
              </GardenerButton>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-aurora-white">Cluster Details</h1>
              <p className="text-aurora-gray-400 text-sm mt-1">View and manage your Kubernetes cluster</p>
            </div>
          </div>

          <div className="flex gap-2">
            <GardenerButton
              size="md"
              variant="secondary"
              onClick={handleShare}
              className="hover:bg-aurora-blue-900/20 hover:text-aurora-blue-300 hover:border-aurora-blue-700"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </GardenerButton>
            <GardenerButton
              size="md"
              variant="primary"
              className="bg-aurora-blue-700 hover:bg-aurora-blue-600 border-aurora-blue-600 text-aurora-white shadow-lg shadow-aurora-blue-900/20"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Cluster
            </GardenerButton>
          </div>
        </div>

        {/* Cluster overview card */}
        <div className="bg-aurora-gray-900 rounded-lg border border-aurora-gray-800 shadow-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-aurora-gray-800 pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-medium text-aurora-white">{cluster.name}</h2>
              <div
                className="text-sm text-aurora-gray-400 mt-1.5 hover:text-aurora-gray-300 transition-colors cursor-pointer"
                onClick={handleShare}
              >
                ID: <span className="font-mono">{cluster.uid}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <div className="flex items-center">
                <div
                  className={`relative w-6 h-6 rounded-full ${statusStyles.bg} ${statusStyles.glow} flex items-center justify-center ${statusStyles.pulse ? "animate-pulse" : ""} mr-2`}
                >
                  {statusStyles.icon}
                </div>
                <div className={`text-lg font-medium ${statusStyles.text}`}>{cluster.status}</div>
              </div>
              <div
                className={`px-3 py-1.5 rounded text-sm ${statusStyles.badgeBg} ${statusStyles.badgeText} border ${statusStyles.badgeBorder}`}
              >
                Readiness: {cluster.readiness}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-aurora-gray-400 uppercase tracking-wider mb-3">
                  Infrastructure
                </h3>
                <div className="bg-aurora-gray-800/50 rounded-md p-5 space-y-4 border border-aurora-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-aurora-gray-400">Provider:</span>
                    <div className="flex items-center">
                      <div className="rounded-md bg-aurora-gray-800 py-1 px-2 mr-2 border border-aurora-gray-700">
                        <span className="uppercase text-xs font-mono text-aurora-blue-300">
                          {cluster.infrastructure.substring(0, 3)}
                        </span>
                      </div>
                      <span className="text-aurora-gray-200 capitalize">{cluster.infrastructure}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-aurora-gray-400">Region:</span>
                    <span className="px-2 py-1 rounded-md bg-aurora-gray-800/80 text-sm text-aurora-purple-300">
                      {cluster.region}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-aurora-gray-400 uppercase tracking-wider mb-3">Kubernetes</h3>
                <div className="bg-aurora-gray-800/50 rounded-md p-5 space-y-4 border border-aurora-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-aurora-gray-400">Version:</span>
                    <div className="flex items-center text-aurora-gray-200">
                      <span className="text-aurora-blue-400 mr-0.5">v</span>
                      {cluster.version}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-aurora-gray-400">Readiness:</span>
                    <div
                      className={`px-2 py-1 rounded text-sm ${statusStyles.badgeBg} ${statusStyles.badgeText} border ${statusStyles.badgeBorder}`}
                    >
                      {cluster.readiness}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workers Section */}
        <WorkersSection workers={cluster.workers} />

        {/* Settings Section */}
        <SettingsSection maintenance={cluster.maintenance} autoUpdate={cluster.autoUpdate} />
      </div>
    </div>
  )
}

export default ClusterDetail

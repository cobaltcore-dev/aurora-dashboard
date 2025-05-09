import React from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/client/components/headless-ui/Button"
import { ArrowLeft, Share2, Edit, RefreshCcw, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/client/components/Table"
import { Cluster } from "@/server/Gardener/types/cluster"
import { toast } from "sonner"

// Component to render worker details
const WorkersSection: React.FC<{ workers: Cluster["workers"] }> = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <Card className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-medium">Workers</CardTitle>
          <Button size="sm" variant="secondary" className="opacity-50 cursor-not-allowed">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Add Worker
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-aurora-gray-400">No worker nodes configured for this cluster.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-medium">Workers</CardTitle>
        <Button size="sm" variant="secondary">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-aurora-gray-800">
            <TableRow className="border-aurora-gray-700">
              <TableHead className="text-aurora-gray-300">Name</TableHead>
              <TableHead className="text-aurora-gray-300">Machine Type</TableHead>
              <TableHead className="text-aurora-gray-300">Image</TableHead>
              <TableHead className="text-aurora-gray-300">Scaling</TableHead>
              <TableHead className="text-aurora-gray-300">Zones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.name} className="border-aurora-gray-800">
                <TableCell className="font-medium text-aurora-white">
                  <div>{worker.name}</div>
                  <div className="text-xs text-aurora-gray-400">{worker.architecture}</div>
                </TableCell>
                <TableCell>
                  <div className="text-aurora-gray-200">{worker.machineType}</div>
                  <div className="text-xs text-aurora-gray-400">{worker.containerRuntime}</div>
                </TableCell>
                <TableCell>
                  <div className="text-aurora-gray-200">{worker.machineImage.name}</div>
                  <div className="text-xs text-aurora-gray-400">v{worker.machineImage.version}</div>
                </TableCell>
                <TableCell>
                  <div className="text-aurora-gray-200">{worker.actual !== undefined ? worker.actual : "?"} nodes</div>
                  <div className="text-xs text-aurora-gray-400">
                    Min: {worker.min} / Max: {worker.max} / Surge: {worker.maxSurge}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {worker.zones.map((zone) => (
                      <span
                        key={zone}
                        className="px-1.5 py-0.5 text-xs bg-aurora-gray-700 text-aurora-gray-300 rounded-md"
                      >
                        {zone}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Component to render maintenance & auto update settings
const SettingsSection: React.FC<{
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}> = ({ maintenance, autoUpdate }) => {
  return (
    <Card className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-medium">Settings</CardTitle>
        <Button size="sm" variant="secondary">
          <Edit className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-aurora-white mb-3">
              Maintenance Window
              <span className="ml-2 text-sm text-aurora-orange-400">Scheduled</span>
            </h3>
            <div className="bg-aurora-gray-800 rounded-md p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-aurora-gray-400">Start Time:</span>
                <span className="text-aurora-gray-200">{maintenance.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-aurora-gray-400">Window Time:</span>
                <span className="text-aurora-gray-200">{maintenance.windowTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-aurora-gray-400">Timezone:</span>
                <span className="text-aurora-gray-200">{maintenance.timezone}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-aurora-white mb-3">Auto Update</h3>
            <div className="bg-aurora-gray-800 rounded-md p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-aurora-gray-400">OS Updates:</span>
                <span className={autoUpdate.os ? "text-aurora-green-500" : "text-aurora-red-500"}>
                  {autoUpdate.os ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-aurora-gray-400">Kubernetes Updates:</span>
                <span className={autoUpdate.kubernetes ? "text-aurora-green-500" : "text-aurora-red-500"}>
                  {autoUpdate.kubernetes ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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

interface ClusterDetailProps {
  cluster: Cluster
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster }) => {
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
    <div className="min-h-screen bg-aurora-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button and title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <Link to="/gardener">
              <Button size="md" variant="secondary" className="mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Clusters
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-aurora-white">Cluster Details</h1>
          </div>

          <div className="flex gap-2">
            <Button size="md" variant="secondary" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              size="md"
              variant="primary"
              className="bg-aurora-blue-700 hover:bg-aurora-blue-600 border-aurora-blue-600"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Cluster
            </Button>
          </div>
        </div>

        {/* Cluster overview card */}
        <div className="bg-aurora-gray-900 rounded-lg border border-aurora-gray-800 shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-aurora-gray-800 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-medium text-aurora-white">{cluster.name}</h2>
              <div className="text-sm text-aurora-gray-400 mt-1">ID: {cluster.uid}</div>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              <div className="flex items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusIndicatorColor(cluster.status)} mr-2`}></div>
                <div className={`text-lg font-medium ${getStatusColor(cluster.status)}`}>{cluster.status}</div>
              </div>
              <div className="bg-aurora-gray-800 px-3 py-1 rounded text-sm">Readiness: {cluster.readiness}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-aurora-gray-400 mb-1">Infrastructure</h3>
                <div className="bg-aurora-gray-800 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-aurora-gray-400">Provider:</span>
                    <span className="text-aurora-gray-200 capitalize">{cluster.infrastructure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-aurora-gray-400">Region:</span>
                    <span className="text-aurora-gray-200">{cluster.region}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-aurora-gray-400 mb-1">Kubernetes</h3>
                <div className="bg-aurora-gray-800 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-aurora-gray-400">Version:</span>
                    <span className="text-aurora-gray-200">{cluster.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-aurora-gray-400">Readiness:</span>
                    <span className="text-aurora-gray-200">{cluster.readiness}</span>
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

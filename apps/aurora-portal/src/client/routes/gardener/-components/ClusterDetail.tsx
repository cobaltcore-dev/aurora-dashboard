import React from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/client/components/headless-ui/Button"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/client/components/Table"
import { Cluster } from "@/server/Gardener/types/cluster"

// Component to render worker details
const WorkersSection: React.FC<{ workers: Cluster["workers"] }> = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <Card className="mt-6 bg-gray-900 border-gray-800 text-white shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Workers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">No worker nodes configured for this cluster.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6 bg-gray-900 border-gray-800 text-white shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Workers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-gray-800">
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Machine Type</TableHead>
              <TableHead className="text-gray-300">Image</TableHead>
              <TableHead className="text-gray-300">Scaling</TableHead>
              <TableHead className="text-gray-300">Zones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.name} className="border-gray-800">
                <TableCell className="font-medium text-white">
                  <div>{worker.name}</div>
                  <div className="text-xs text-gray-400">{worker.architecture}</div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-200">{worker.machineType}</div>
                  <div className="text-xs text-gray-400">{worker.containerRuntime}</div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-200">{worker.machineImage.name}</div>
                  <div className="text-xs text-gray-400">v{worker.machineImage.version}</div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-200">{worker.actual !== undefined ? worker.actual : "?"} nodes</div>
                  <div className="text-xs text-gray-400">
                    Min: {worker.min} / Max: {worker.max} / Surge: {worker.maxSurge}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {worker.zones.map((zone) => (
                      <span key={zone} className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-md">
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
    <Card className="mt-6 bg-gray-900 border-gray-800 text-white shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-red mb-3">Maintenance Window</h3>
            <div className="bg-gray-800 rounded-md p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sap-grey-1">Start Time:</span>
                <span className="text-gray-200">{maintenance.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Window Time:</span>
                <span className="text-gray-200">{maintenance.windowTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timezone:</span>
                <span className="text-gray-200">{maintenance.timezone}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-3">Auto Update</h3>
            <div className="bg-gray-800 rounded-md p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">OS Updates:</span>
                <span className={autoUpdate.os ? "text-green-500" : "text-red-500"}>
                  {autoUpdate.os ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kubernetes Updates:</span>
                <span className={autoUpdate.kubernetes ? "text-green-500" : "text-red-500"}>
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
      return "text-green-500"
    case "warning":
      return "text-yellow-500"
    case "unhealthy":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

interface ClusterDetailProps {
  cluster: Cluster
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster }) => {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Button className="mr-4">
            <Link to="/gardener">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clusters
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-white">Cluster Details</h1>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-md p-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-medium text-white">{cluster.name}</h2>
              <div className="text-sm text-gray-400 mt-1">ID: {cluster.uid}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-medium ${getStatusColor(cluster.status)}`}>{cluster.status}</div>
              <div className="bg-gray-800 px-3 py-1 rounded text-sm">Readiness: {cluster.readiness}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Infrastructure</h3>
                <div className="bg-gray-800 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Provider:</span>
                    <span className="text-gray-200 capitalize">{cluster.infrastructure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Region:</span>
                    <span className="text-gray-200">{cluster.region}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Kubernetes</h3>
                <div className="bg-gray-800 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span className="text-gray-200">{cluster.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Readiness:</span>
                    <span className="text-gray-200">{cluster.readiness}</span>
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

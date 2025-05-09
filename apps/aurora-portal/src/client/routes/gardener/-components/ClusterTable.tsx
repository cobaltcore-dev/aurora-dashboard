import React, { useState } from "react"
import ClusterTableRow from "./ClusterTableRow"
import { Button } from "@/client/components/headless-ui/Button"
import { Plus } from "lucide-react"
import { Cluster } from "@/server/Gardener/types/cluster"

// Mock data for clusters
const mockClusters: Cluster[] = [
  {
    uid: "c1a2b3d4",
    name: "shoot-aws-dev",
    region: "eu-west-1",
    infrastructure: "aws",
    status: "Healthy",
    version: "1.28.2",
    readiness: "100%",
    workers: [
      {
        name: "worker-small",
        architecture: "amd64",
        machineType: "t3.medium",
        machineImage: {
          name: "ubuntu",
          version: "20.04",
        },
        containerRuntime: "containerd",
        min: 2,
        max: 5,
        actual: undefined,
        maxSurge: 1,
        zones: ["eu-west-1a", "eu-west-1b"],
      },
    ],
    maintenance: {
      startTime: "030000+0000",
      timezone: "Europe/Dublin",
      windowTime: "040000+0000",
    },
    autoUpdate: {
      os: true,
      kubernetes: false,
    },
  },
  {
    uid: "d5e6f7g8",
    name: "shoot-gcp-prod",
    region: "us-central1",
    infrastructure: "gcp",
    status: "Warning",
    version: "1.29.0",
    readiness: "95%",
    workers: [
      {
        name: "worker-medium",
        architecture: "amd64",
        machineType: "n2-standard-4",
        machineImage: {
          name: "ubuntu",
          version: "22.04",
        },
        containerRuntime: "containerd",
        min: 3,
        max: 7,
        actual: 5,
        maxSurge: 2,
        zones: ["us-central1-a", "us-central1-b", "us-central1-c"],
      },
      {
        name: "worker-large",
        architecture: "amd64",
        machineType: "n2-standard-8",
        machineImage: {
          name: "ubuntu",
          version: "22.04",
        },
        containerRuntime: "containerd",
        min: 1,
        max: 3,
        actual: 2,
        maxSurge: 1,
        zones: ["us-central1-a"],
      },
    ],
    maintenance: {
      startTime: "010000+0000",
      timezone: "America/Chicago",
      windowTime: "020000+0000",
    },
    autoUpdate: {
      os: true,
      kubernetes: true,
    },
  },
  {
    uid: "h8i9j0k1",
    name: "shoot-azure-test",
    region: "eastus2",
    infrastructure: "azure",
    status: "Unhealthy",
    version: "1.28.3",
    readiness: "75%",
    workers: [
      {
        name: "worker-small",
        architecture: "amd64",
        machineType: "Standard_D2s_v3",
        machineImage: {
          name: "ubuntu",
          version: "20.04",
        },
        containerRuntime: "containerd",
        min: 1,
        max: 3,
        actual: 1,
        maxSurge: 1,
        zones: ["eastus2-1"],
      },
    ],
    maintenance: {
      startTime: "020000+0000",
      timezone: "America/New_York",
      windowTime: "030000+0000",
    },
    autoUpdate: {
      os: false,
      kubernetes: false,
    },
  },
]

const ClusterTable: React.FC<{ propClusters?: Cluster[] }> = ({ propClusters }) => {
  const [clusters] = useState<Cluster[]>(propClusters ?? mockClusters)

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          New Cluster
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50">
        <table className="w-full text-left border-collapse text-gray-300">
          <thead className="bg-gray-900/70">
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="p-3">Name</th>
              <th className="p-3">Infrastructure</th>
              <th className="p-3">Region</th>
              <th className="p-3">Version</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster, index) => (
              <ClusterTableRow key={cluster.uid} cluster={cluster} isLast={index === clusters.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClusterTable

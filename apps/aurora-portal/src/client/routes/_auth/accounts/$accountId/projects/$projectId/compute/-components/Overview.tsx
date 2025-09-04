import { ActivitySummary } from "./ActivitySummary"
import { Suspense, use } from "react"
import { Server } from "@/server/Compute/types/server"
import { GlanceImage } from "@/server/Compute/types/image"
import { TrpcClient } from "@/client/trpcClient"

interface OverviewContainerProps {
  getDataPromise: Promise<[Server[] | undefined, GlanceImage[] | undefined]>
}
const OverviewContainer = ({ getDataPromise }: OverviewContainerProps) => {
  const [servers, images] = use(getDataPromise)
  if (!servers && !images) return <div className="p-4 text-center text-gray-400">No data found</div>

  // Calculate server statistics
  const activeServers = servers?.filter((server) => server.status === "ACTIVE")?.length || 0
  const totalServers = servers?.length || 0
  const estimatedServerQuota = Math.max(10, Math.ceil(totalServers * 1.5))

  // Calculate resource usage based on server flavors
  let totalCores = 0
  let usedMemoryMB = 0
  let totalDiskGB = 0

  // Process server data to extract resource usage
  servers?.forEach((server) => {
    // Extract core count from flavor if available
    if (server.flavor && server.flavor.vcpus) {
      totalCores += server.flavor.vcpus
    } else {
      // Fallback estimate based on server name or other heuristics
      const smallestSize = server.name?.includes("small") || server.name?.includes("micro")
      totalCores += smallestSize ? 1 : 2
    }

    // Extract memory usage from flavor if available
    if (server.flavor && server.flavor.ram) {
      usedMemoryMB += server.flavor.ram
    } else {
      // Fallback estimate
      usedMemoryMB += 1024 // Assume 1GB per instance as fallback
    }

    // Extract disk usage from flavor if available
    if (server.flavor && server.flavor.disk) {
      totalDiskGB += server.flavor.disk
    } else {
      // Fallback estimate
      totalDiskGB += 20 // Assume 20GB per instance as fallback
    }
  })

  // Calculate image statistics
  const activeImages = images?.filter((image) => image.status === "active")?.length || 0
  const totalImages = images?.length || 0

  // Calculate resource percentage utilizations
  const cpuPercentage = Math.min(100, Math.round((totalCores / 32) * 100))
  const memoryPercentage = Math.min(100, Math.round((usedMemoryMB / 131072) * 100))
  const storagePercentage = Math.min(100, Math.round((totalDiskGB / 1024) * 100))

  // Prepare data to pass to ActivitySummary
  const activityData = {
    instances: {
      current: activeServers,
      total: totalServers,
      quota: estimatedServerQuota,
      color: "#FF5733",
    },
    cpu: {
      percentage: cpuPercentage,
      cores: totalCores,
      color: "#33A1FD",
    },
    memory: {
      percentage: memoryPercentage,
      usedMB: usedMemoryMB,
      color: "#9B59B6", // Purple color for memory
    },
    storage: {
      percentage: storagePercentage,
      sizeGB: totalDiskGB,
      color: "#4CAF50",
    },
    images: {
      active: activeImages,
      total: totalImages,
      color: "#F1C40F", // Yellow color for images if you want to use it
    },
  }

  return (
    <div className="h-full">
      <ActivitySummary activityData={activityData} />
    </div>
  )
}

interface OverviewProps {
  client: TrpcClient
  project: string
}

export function Overview({ client, project }: OverviewProps) {
  const getDataPromise = Promise.all([
    client.compute.getServersByProjectId.query({ projectId: project }),
    client.compute.listImages.query({ projectId: project }),
  ])

  return (
    <Suspense fallback={<div className="p-4 text-center">Loading data...</div>}>
      <OverviewContainer getDataPromise={getDataPromise} />
    </Suspense>
  )
}

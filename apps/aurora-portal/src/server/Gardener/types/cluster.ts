import { z } from "zod"

// Define simplified cluster schema for the UI
export const clusterSchema = z.object({
  // List view fields
  uid: z.string().uuid(),
  name: z.string(),
  region: z.string(),
  infrastructure: z.string(),
  status: z.string(),
  version: z.string(),
  readiness: z.string(),

  // Additional detail fields
  workers: z.array(
    z.object({
      name: z.string(),
      architecture: z.string(),
      machineType: z.string(),
      machineImage: z.object({
        name: z.string(),
        version: z.string(),
      }),
      containerRuntime: z.string(),
      min: z.number(),
      max: z.number(),
      actual: z.number().optional(),
      maxSurge: z.number(),
      zones: z.array(z.string()),
    })
  ),

  maintenance: z.object({
    startTime: z.string(),
    timezone: z.string(),
    windowTime: z.string(),
  }),

  autoUpdate: z.object({
    os: z.boolean(),
    kubernetes: z.boolean(),
  }),
})

export type Cluster = z.infer<typeof clusterSchema>

/**
 * Converts a raw API response directly to the simplified UI cluster format
 */
export function createClusterFromApiResponse(apiResponse: any): Cluster {
  // Helper function to get status from conditions
  const getStatus = (response: any): string => {
    if (!response.status?.lastOperation) return "Unknown"

    const state = response.status.lastOperation.state

    if (state === "Failed") return "Error"
    if (state === "Succeeded") return "Operational"
    if (state === "Processing") return "Reconciling"
    return state
  }

  // Helper function to get readiness based on conditions
  const getReadiness = (response: any): string => {
    if (!response.status?.conditions) return "Unknown"

    // Count True conditions vs total
    const conditions = response.status.conditions
    const healthyCount = conditions.filter((c: any) => c.status === "True").length

    return `${healthyCount}/${conditions.length}`
  }

  return {
    // List view fields
    uid: apiResponse.metadata.uid,
    name: apiResponse.metadata.name,
    region: apiResponse.spec.region,
    infrastructure: apiResponse.spec.provider.type,
    status: getStatus(apiResponse),
    version: apiResponse.spec.kubernetes.version,
    readiness: getReadiness(apiResponse),

    // Detail fields - Workers
    workers: apiResponse.spec.provider.workers.map((worker: any) => ({
      name: worker.name,
      architecture: worker.machine.architecture,
      machineType: worker.machine.type,
      machineImage: {
        name: worker.machine.image.name,
        version: worker.machine.image.version,
      },
      containerRuntime: worker.cri.name,
      min: worker.minimum,
      max: worker.maximum,
      actual: undefined, // Would need to come from a separate API call
      maxSurge: worker.maxSurge,
      zones: worker.zones,
    })),

    // Maintenance info
    maintenance: {
      startTime: apiResponse.spec.maintenance?.timeWindow.begin || "",
      timezone: apiResponse.spec.hibernation?.schedules?.[0]?.location || "",
      windowTime: apiResponse.spec.maintenance?.timeWindow.end || "",
    },

    // Auto update
    autoUpdate: {
      os: apiResponse.spec.maintenance?.autoUpdate.machineImageVersion || false,
      kubernetes: apiResponse.spec.maintenance?.autoUpdate.kubernetesVersion || false,
    },
  }
}

export function createClustersFromApiResponse(apiResponse: any): Cluster[] {
  if (!apiResponse.items) return []
  return apiResponse.items.map((item: any) => createClusterFromApiResponse(item))
}

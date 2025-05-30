import { z } from "zod"
import { ShootApiResponse } from "./shootApiSchema"

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

  // New state information fields
  stateDetails: z
    .object({
      state: z.string().optional(),
      progress: z.number().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
      lastTransitionTime: z.string().optional(),
    })
    .optional(),

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
      actual: z.number().optional(), // This might need to come from another API
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
 * Converts a Gardener Shoot item to a simplified UI cluster format
 */
export function convertShootApiResponseToCluster(shoot: ShootApiResponse): Cluster {
  // Helper function to get status from conditions
  const getStatus = (shoot: ShootApiResponse): string => {
    if (!shoot.status?.lastOperation) return "Unknown"

    const state = shoot.status.lastOperation.state

    if (state === "Failed") return "Error"
    if (state === "Succeeded") return "Operational"
    if (state === "Processing") return "Reconciling"
    return state
  }

  // Helper function to get readiness based on conditions
  const getReadiness = (shoot: ShootApiResponse): string => {
    if (!shoot.status?.conditions) return "Unknown"

    // Count True conditions vs total
    const conditions = shoot.status.conditions
    const healthyCount = conditions.filter((c) => c.status === "True").length

    return `${healthyCount}/${conditions.length}`
  }

  // New helper function to extract state details
  const getStateDetails = (shoot: ShootApiResponse) => {
    if (!shoot.status?.lastOperation) return undefined

    const { state, type, progress, description, lastUpdateTime } = shoot.status.lastOperation

    return {
      state: state,
      progress: typeof progress === "number" ? progress : undefined,
      type: type,
      description: description,
      lastTransitionTime: lastUpdateTime,
    }
  }

  return {
    // List view fields
    uid: shoot.metadata.uid,
    name: shoot.metadata.name,
    region: shoot.spec.region,
    infrastructure: shoot.spec.provider.type,
    status: getStatus(shoot),
    version: shoot.spec.kubernetes.version,
    readiness: getReadiness(shoot),

    // Add the state details
    stateDetails: getStateDetails(shoot),

    // Detail fields - Workers
    workers: shoot.spec.provider.workers.map((worker) => ({
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
      startTime: shoot.spec.maintenance?.timeWindow.begin || "",
      timezone: shoot.spec.hibernation?.schedules?.[0]?.location || "",
      windowTime: shoot.spec.maintenance?.timeWindow.end || "",
    },

    // Auto update
    autoUpdate: {
      os: shoot.spec.maintenance?.autoUpdate.machineImageVersion || false,
      kubernetes: shoot.spec.maintenance?.autoUpdate.kubernetesVersion || false,
    },
  }
}

export function convertShootListApiSchemaToClusters(shoots: ShootApiResponse[]): Cluster[] {
  if (!shoots) return []
  return shoots.map(convertShootApiResponseToCluster)
}

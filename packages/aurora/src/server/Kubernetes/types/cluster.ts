import { z } from "zod"
import { kubernetesInputSchema, clusterNameSchema, clusterInputSchema } from "./common"

const cidrSchema = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/)

export const workerGroupInputSchema = z
  .object({
    name: clusterNameSchema,
    machineType: z.string().min(1),
    machineImage: z.object({
      name: z.string().min(1),
      version: z.string().min(1),
    }),
    minimum: z.number().int().min(0),
    maximum: z.number().int().min(0),
    zones: z.array(z.string().min(1)).min(1),
  })
  .refine((w) => w.maximum >= w.minimum, {
    message: "maximum must be >= minimum",
  })

export const clusterCreateInputSchema = kubernetesInputSchema.extend({
  name: clusterNameSchema,
  cloudProfileName: z.string().min(1),
  kubernetesVersion: z.string().min(1),
  infrastructure: z.object({
    floatingPoolName: z.string().min(1),
    apiVersion: z.string().min(1),
    networkWorkers: cidrSchema.optional(),
  }),
  networking: z
    .object({
      pods: cidrSchema.optional(),
      nodes: cidrSchema.optional(),
      services: cidrSchema.optional(),
    })
    .optional(),
  workers: z.array(workerGroupInputSchema).min(1),
})

export const clusterUpdateInputSchema = clusterInputSchema
  .extend({
    kubernetesVersion: z.string().min(1).optional(),
    workers: z.array(workerGroupInputSchema).min(1).optional(),
    maintenance: z
      .object({
        startTime: hhmmSchema,
        endTime: hhmmSchema,
        timezone: z.string().regex(/^[+-]\d{2}:?\d{2}$/),
      })
      .optional(),
    autoUpdate: z
      .object({
        os: z.boolean(),
        kubernetes: z.boolean(),
      })
      .optional(),
  })
  .refine((data) => data.kubernetesVersion || data.workers || data.maintenance || data.autoUpdate, {
    message: "At least one field must be provided",
  })

export const clusterReplaceInputSchema = clusterInputSchema
  .extend({
    resource: z
      .object({
        apiVersion: z.literal("core.gardener.cloud/v1beta1"),
        kind: z.literal("Shoot"),
        metadata: z
          .object({
            name: z.string(),
            namespace: z.string().optional(),
            resourceVersion: z.string().optional(),
          })
          .passthrough(),
        spec: z.object({}).passthrough(),
      })
      .passthrough(),
  })
  .refine((data) => data.resource.metadata.name === data.name, {
    message: "Resource name must match cluster name",
  })

export type Cluster = {
  uid?: string
  name: string
  namespace?: string
  createdBy?: string
  isDeleted: boolean
  region?: string
  infrastructure?: string
  status: "healthy" | "progressing" | "unhealthy" | "unknown"
  version?: string
  versionUpdates: { patch: string[]; minor: string[]; major: string[] } | null
  readiness: {
    status: string
    conditions: {
      displayValue: string
      type: string
      status: string
      message?: string
      lastUpdateTime?: string
    }[]
  }
  purpose?: string
  addOns: string[]
  cloudProfileName?: string
  labels: Record<string, string>
  lastOperation?: {
    description?: string
    lastUpdateTime?: string
    progress?: number
    state?: string
    type?: string
  }
  lastOperationSummary?: string
  lastErrors: {
    description: string
    taskID: string
    lastUpdateTime?: string
  }[]
  workers: {
    name: string
    architecture?: string
    machineType?: string
    machineImage: {
      name?: string
      version?: string
    }
    containerRuntime?: string
    min?: number
    max?: number
    maxSurge?: number | string
    zones: string[]
  }[]
  maintenance: {
    startTime: string
    endTime: string
    timezone: string
  }
  lastMaintenance: {
    state?: string
  }
  autoUpdate: {
    os: boolean
    kubernetes: boolean
  }
  raw?: Record<string, unknown>
}

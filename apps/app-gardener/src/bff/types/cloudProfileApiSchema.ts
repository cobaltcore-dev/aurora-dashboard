import { z } from "zod"

// Helper schemas
const kubernetesVersionSchema = z.object({
  version: z.string(),
  expirationDate: z.string().datetime().optional(),
  classification: z.string().optional(),
})

const machineImageVersionSchema = z.object({
  version: z.string(),
  expirationDate: z.string().datetime().optional(),
  classification: z.string().optional(),
  architectures: z.array(z.enum(["amd64", "arm64"])).optional(),
  cri: z
    .array(
      z.object({
        name: z.string(),
      })
    )
    .optional(),
})

const machineImageSchema = z.object({
  name: z.string(),
  updateStrategy: z.enum(["patch", "minor", "major"]).optional(),
  versions: z.array(machineImageVersionSchema),
})

const machineTypeStorageSchema = z.object({
  class: z.string().optional(),
  size: z.string().optional(),
  type: z.string().optional(),
})

const machineTypeSchema = z.object({
  name: z.string(),
  architecture: z.enum(["amd64", "arm64"]).optional(),
  cpu: z.string(),
  gpu: z.string().optional(),
  memory: z.string(),
  storage: machineTypeStorageSchema.optional(),
  usable: z.boolean().optional(),
})

const regionSchema = z.object({
  name: z.string(),
  zones: z
    .array(
      z.object({
        name: z.string(),
        unavailableMachineTypes: z.array(z.string()).optional(),
        unavailableVolumeTypes: z.array(z.string()).optional(),
      })
    )
    .optional(),
})

const bastionSchema = z.object({
  machineImage: z
    .object({
      name: z.string(),
      version: z.string().optional(),
    })
    .optional(),
  machineType: z
    .object({
      name: z.string(),
    })
    .optional(),
})

const volumeTypeSchema = z.object({
  name: z.string(),
  class: z.string().optional(),
  usable: z.boolean().optional(),
})

// Main CloudProfile schema
export const cloudProfileApiResponseSchema = z.object({
  metadata: z.object({
    name: z.string(),
    uid: z.string().uuid(),
    resourceVersion: z.string(),
    generation: z.number().int().positive().optional(),
    creationTimestamp: z.string().datetime(),
    labels: z.record(z.string()).optional(),
    annotations: z.record(z.string()).optional().optional(),
  }),
  spec: z.object({
    type: z.string(),
    kubernetes: z.object({
      versions: z.array(kubernetesVersionSchema),
    }),
    machineImages: z.array(machineImageSchema),
    machineTypes: z.array(machineTypeSchema),
    regions: z.array(regionSchema).optional(),
    volumeTypes: z.array(volumeTypeSchema).optional(),
    bastion: bastionSchema.optional(),
    providerConfig: z.record(z.any()).optional(),
    seeds: z
      .array(
        z.object({
          name: z.string(),
          providerConfig: z.record(z.any()).optional(),
        })
      )
      .optional(),
  }),
})

// CloudProfile list schema
export const cloudProfileListApiResponseSchema = z.object({
  apiVersion: z.literal("core.gardener.cloud/v1beta1"),
  kind: z.literal("CloudProfileList"),
  metadata: z.object({
    resourceVersion: z.string(),
  }),
  items: z.array(cloudProfileApiResponseSchema),
})

// Type definitions
export type CloudProfileApiResponse = z.infer<typeof cloudProfileApiResponseSchema>
export type CloudProfileListApiResponse = z.infer<typeof cloudProfileListApiResponseSchema>

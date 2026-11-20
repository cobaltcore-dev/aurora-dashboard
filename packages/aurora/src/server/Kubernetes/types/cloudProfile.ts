import { z } from "zod"

export const cloudProfileListSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            metadata: z
              .object({
                name: z.string(),
                uid: z.string().optional(),
              })
              .passthrough(),
            spec: z.object({}).passthrough().optional(),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough()

export type CloudProfile = {
  uid?: string
  name: string
  provider?: string
  providerConfig: {
    apiVersion?: string
  }
  kubernetesVersions: string[]
  machineTypes: {
    name: string
    architecture?: string
    cpu?: string
    memory?: string
  }[]
  machineImages: {
    name: string
    versions: string[]
  }[]
  regions: {
    name: string
    zones?: {
      name: string
      unavailableMachineTypes?: string[]
    }[]
  }[]
}

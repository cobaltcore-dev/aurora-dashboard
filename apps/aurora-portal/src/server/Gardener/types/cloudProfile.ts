import { z } from "zod"

// Define simplified CloudProfile schema for the UI
export const cloudProfileSchema = z.object({
  uid: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  kubernetesVersions: z.array(z.string()),
  machineTypes: z.array(z.string()),
  machineImages: z.array(
    z.object({
      name: z.string(),
      versions: z.array(z.string()),
    })
  ),
  regions: z.array(
    z.object({
      name: z.string(),
      zones: z.array(z.string()),
    })
  ),
})

export const cloudProfileListSchema = z.object({
  items: z.array(cloudProfileSchema),
  metadata: z.object({
    resourceVersion: z.string(),
    selfLink: z.string(),
  }),
})

export type CloudProfile = z.infer<typeof cloudProfileSchema>

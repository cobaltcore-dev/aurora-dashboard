import { z } from "zod"

export const shootSchema = z
  .object({
    metadata: z
      .object({
        name: z.string(),
        namespace: z.string().optional(),
        uid: z.string().optional(),
        resourceVersion: z.string().optional(),
        labels: z.record(z.string(), z.string()).optional(),
        annotations: z.record(z.string(), z.string()).optional(),
        deletionTimestamp: z.string().nullish(),
      })
      .passthrough(),
    spec: z.object({}).passthrough().optional(),
    status: z.object({}).passthrough().optional(),
  })
  .passthrough()

export const shootListSchema = z
  .object({
    items: z.array(shootSchema).default([]),
  })
  .passthrough()

export type Shoot = z.infer<typeof shootSchema>
export type ShootList = z.infer<typeof shootListSchema>

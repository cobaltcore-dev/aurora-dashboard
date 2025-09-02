import { z } from "zod"

const linkSchema = z.object({
  href: z.string().url().nullable().optional(),
  rel: z.string().nullable().optional(),
})

export const flavorSchema = z.object({
  "OS-FLV-DISABLED:disabled": z.boolean().optional(),
  "OS-FLV-EXT-DATA:ephemeral": z.number().optional(),
  "os-flavor-access:is_public": z.boolean().optional(),
  id: z.string().optional(),
  name: z.string(),
  vcpus: z.number(),
  ram: z.number(),
  disk: z.number(),
  swap: z.union([z.string(), z.number()]).optional(),
  rxtx_factor: z.number().optional(),
  description: z.string().nullable().optional(),
  links: z.array(linkSchema).optional(),
  extra_specs: z.record(z.string()).optional(),
})

export const flavorResponseSchema = z.object({
  flavors: z.array(flavorSchema),
})

export type Flavor = z.infer<typeof flavorSchema>

export type CreateFlavorInput = {
  id?: string
  name: string
  vcpus: number
  ram: number
  disk: number
  swap?: number
  rxtx_factor?: number
  "OS-FLV-EXT-DATA:ephemeral"?: number
}

import { z } from "zod"

const linkSchema = z.object({
  href: z.string().url(),
  rel: z.string(),
})

const networkSchema = z.object({
  admin_state_up: z.boolean().optional(),
  id: z.string(),
  name: z.string().nullable().optional(),
  "provider:network_type": z.string().nullable().optional(),
  "provider:physical_network": z.string().nullable().optional(),
  "provider:segmentation_id": z.number().nullable().optional(),
  "router:external": z.boolean().optional(),
  shared: z.boolean().optional(),
  status: z.string().nullable().optional(),
  subnets: z.array(z.any()).optional(), // Assuming subnets can be any type for now
  tenant_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
})

export const networkResponseSchema = z.object({
  networks: z.array(networkSchema),
  networks_links: z.array(linkSchema).optional(),
})

export type Network = z.infer<typeof networkSchema>

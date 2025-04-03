import { z } from "zod"

export const networkSegmentSchema = z.object({
  provider_network_type: z.string().optional(),
  provider_physical_network: z.string().optional().nullable(),
  provider_segmentation_id: z.number().optional().nullable(),
})

export const networkSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  admin_state_up: z.boolean().optional(),
  status: z.string().optional(),
  subnets: z.array(z.string()).optional(),
  tenant_id: z.string().optional().nullable(), // Legacy field
  project_id: z.string().optional().nullable(),
  shared: z.boolean().optional(),
  availability_zone_hints: z.array(z.string()).optional(),
  availability_zones: z.array(z.string()).optional(),
  ipv4_address_scope: z.string().optional().nullable(),
  ipv6_address_scope: z.string().optional().nullable(),
  router_external: z.boolean().optional(), // 'router:external' with colon in API
  "router:external": z.boolean().optional(), // Alternative representation
  external: z.boolean().optional(), // Simplified field
  port_security_enabled: z.boolean().optional(),
  mtu: z.number().optional(),
  provider_network_type: z.string().optional().nullable(),
  provider_physical_network: z.string().optional().nullable(),
  provider_segmentation_id: z.number().optional().nullable(),
  segments: z.array(networkSegmentSchema).optional(),
  tags: z.array(z.string()).optional(),
  revision_number: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional().nullable(),
  qos_policy_id: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
  dns_domain: z.string().optional().nullable(),
})

export const networkResponseSchema = z.object({
  network: networkSchema,
})

export const networksResponseSchema = z.object({
  networks: z.array(networkSchema),
})

// Schema for creating a new network
export const createNetworkSchema = z.object({
  network: z.object({
    name: z.string().optional(),
    admin_state_up: z.boolean().optional(),
    shared: z.boolean().optional(),
    tenant_id: z.string().optional(),
    project_id: z.string().optional(),
    router_external: z.boolean().optional(), // 'router:external' with colon in API
    "router:external": z.boolean().optional(), // Alternative representation
    external: z.boolean().optional(), // Simplified field
    provider_network_type: z.string().optional(),
    provider_physical_network: z.string().optional(),
    provider_segmentation_id: z.number().optional(),
    segments: z.array(networkSegmentSchema).optional(),
    port_security_enabled: z.boolean().optional(),
    mtu: z.number().optional(),
    qos_policy_id: z.string().optional(),
    dns_domain: z.string().optional(),
    description: z.string().optional(),
    is_default: z.boolean().optional(),
  }),
})

export type Network = z.infer<typeof networkSchema>
export type NetworkSegment = z.infer<typeof networkSegmentSchema>
export type NetworkResponse = z.infer<typeof networkResponseSchema>
export type NetworksResponse = z.infer<typeof networksResponseSchema>
export type CreateNetwork = z.infer<typeof createNetworkSchema>

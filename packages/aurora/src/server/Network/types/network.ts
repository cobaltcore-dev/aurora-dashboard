import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { ISO8601TimestampSchema, SortDirSchema } from "./index"

/* -------------------------------------------------------------------------- */
/*                         Neutron response schemas                           */
/* -------------------------------------------------------------------------- */

export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  description: z.string().optional().default(""),
  status: z.string(),
  admin_state_up: z.boolean(),
  shared: z.boolean().optional().default(false),
  // Neutron exposes the external flag as "router:external"
  "router:external": z.boolean().optional().default(false),
  mtu: z.number().nullish(),
  port_security_enabled: z.boolean().nullish(),
  // Subnet IDs attached to this network
  subnets: z.array(z.string()).optional().default([]),
  availability_zones: z.array(z.string()).optional(),
  availability_zone_hints: z.array(z.string()).optional(),
  project_id: z.string(),
  tenant_id: z.string().optional(),
  revision_number: z.number().optional(),
  tags: z.array(z.string()).optional(),
  created_at: ISO8601TimestampSchema.optional(),
  updated_at: ISO8601TimestampSchema.optional(),
})

export const NetworkListResponseSchema = z.object({
  networks: z.array(NetworkSchema),
})

export const NetworkResponseSchema = z.object({
  network: NetworkSchema,
})

/** Subnet as shown in a network's detail "Subnets" tab. */
export const NetworkSubnetSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  cidr: z.string().optional(),
  ip_version: z.number().optional(),
  gateway_ip: z.string().nullish(),
  enable_dhcp: z.boolean().optional(),
})

export const NetworkSubnetListResponseSchema = z.object({
  subnets: z.array(NetworkSubnetSchema),
})

/* -------------------------------------------------------------------------- */
/*                              tRPC input schemas                            */
/* -------------------------------------------------------------------------- */

const resourceIdSchema = z.string().trim().min(1, "ID is required")

/** Sort keys supported by Neutron for GET /v2.0/networks */
export const NetworkSortKeySchema = z.enum(["name", "status", "admin_state_up", "shared"])

export const NetworkQueryParametersSchema = projectScopedInputSchema.extend({
  // Passed through to Neutron
  name: z.string().optional(),
  admin_state_up: z.boolean().optional(),
  shared: z.boolean().optional(),
  sort_key: NetworkSortKeySchema.optional(),
  sort_dir: SortDirSchema.optional(),
  // Applied BFF-side
  searchTerm: z.string().trim().optional(),
  status: z.string().optional(),
})

export const NetworkIdInputSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
})

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Network = z.infer<typeof NetworkSchema>
export type NetworkSubnet = z.infer<typeof NetworkSubnetSchema>
export type NetworkQueryParameters = z.infer<typeof NetworkQueryParametersSchema>

/**
 * Network as returned by `list` / `getById`.
 * `external` and `subnet_count` are derived BFF-side from the raw Neutron fields
 * (`router:external` and `subnets`) so the UI stays free of OpenStack-specific keys.
 */
export type NetworkListItem = Omit<Network, "router:external"> & {
  external: boolean
  subnet_count: number
}

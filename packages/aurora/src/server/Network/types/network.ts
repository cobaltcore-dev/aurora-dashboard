import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { ISO8601TimestampSchema } from "./index"

/* -------------------------------------------------------------------------- */
/*                                 Primitives                                 */
/* -------------------------------------------------------------------------- */

const resourceIdSchema = z.string().trim().min(1, "ID is required")
const nameSchema = z.string().trim().max(255, "Name must be at most 255 characters")
const descriptionSchema = z.string().max(255, "Description must be at most 255 characters")
// Neutron's minimum MTU for IPv4 is 68; the upper bound depends on the deployment (global_physnet_mtu)
const mtuSchema = z.number().int().min(68, "MTU must be at least 68")
// Neutron tags are strings of at most 255 characters. Commas are rejected because tag filters are comma-separated.
const tagSchema = z
  .string()
  .trim()
  .min(1, "Tag must not be empty")
  .max(255, "Tag must be at most 255 characters")
  .refine((value) => !value.includes(","), { message: "Tag must not contain commas" })

/* -------------------------------------------------------------------------- */
/*                         Neutron response schemas                           */
/* -------------------------------------------------------------------------- */

export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  description: z.string().optional().default(""),
  // ACTIVE, DOWN, BUILD or ERROR; kept as a plain string so new values don't break the list
  status: z.string(),
  admin_state_up: z.boolean(),
  shared: z.boolean().optional().default(false),
  subnets: z.array(z.string()).optional().default([]),
  project_id: z.string(),
  tenant_id: z.string().optional(),
  // Only present when the `net-mtu` extension is enabled
  mtu: z.number().nullish(),
  // Only present when the `external-net` extension is enabled
  "router:external": z.boolean().nullish(),
  // Only present when the `port-security` extension is enabled
  port_security_enabled: z.boolean().nullish(),
  // Only present when the corresponding extensions are enabled (qos, dns-integration, address-scope, ...)
  qos_policy_id: z.string().nullish(),
  dns_domain: z.string().nullish(),
  ipv4_address_scope: z.string().nullish(),
  ipv6_address_scope: z.string().nullish(),
  is_default: z.boolean().nullish(),
  vlan_transparent: z.boolean().nullish(),
  l2_adjacency: z.boolean().nullish(),
  availability_zone_hints: z.array(z.string()).optional(),
  availability_zones: z.array(z.string()).optional(),
  // Admin-only under the default Neutron policy (`provider` extension)
  "provider:network_type": z.string().nullish(),
  "provider:physical_network": z.string().nullish(),
  "provider:segmentation_id": z.number().nullish(),
  revision_number: z.number().optional(),
  tags: z.array(z.string()).optional(),
  created_at: ISO8601TimestampSchema.optional(),
  updated_at: ISO8601TimestampSchema.optional(),
})

/** Neutron pagination links; the `next` href drives the BFF's full-list fetch across pages. */
const PaginationLinksSchema = z.array(z.object({ rel: z.string(), href: z.string() })).optional()

export const NetworkListResponseSchema = z.object({
  networks: z.array(NetworkSchema),
  networks_links: PaginationLinksSchema,
})

export const NetworkResponseSchema = z.object({
  network: NetworkSchema,
})

/** Response body of PUT /v2.0/networks/{id}/tags */
export const NetworkTagsResponseSchema = z.object({
  tags: z.array(z.string()),
})

/** Subnet fields shown in the network's Subnets tab (GET /v2.0/subnets?network_id=...&fields=...). */
export const NetworkSubnetSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  cidr: z.string(),
  ip_version: z.number(),
  gateway_ip: z.string().nullish(),
  enable_dhcp: z.boolean().optional(),
  allocation_pools: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional()
    .default([]),
  dns_nameservers: z.array(z.string()).optional().default([]),
  host_routes: z
    .array(z.object({ destination: z.string(), nexthop: z.string() }))
    .optional()
    .default([]),
})

export const NetworkSubnetListResponseSchema = z.object({
  subnets: z.array(NetworkSubnetSchema),
  subnets_links: PaginationLinksSchema,
})

/* -------------------------------------------------------------------------- */
/*                              tRPC input schemas                            */
/* -------------------------------------------------------------------------- */

/** Sort keys supported by Neutron for GET /v2.0/networks */
export const NetworkSortKeySchema = z.enum([
  "admin_state_up",
  "availability_zone_hints",
  "id",
  "mtu",
  "name",
  "status",
  "project_id",
  "tenant_id",
])

/**
 * Input for `list`. The list returns every network visible to the project (own + shared); search, filter
 * and sort are applied client-side over that single response (E5), so no query/sort/search params are sent.
 */
export const NetworkQueryParametersSchema = projectScopedInputSchema

export const NetworkIdInputSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
})

export const NetworkCreateRequestSchema = projectScopedInputSchema.extend({
  name: nameSchema.min(1, "Name is required"),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  port_security_enabled: z.boolean().optional(),
  mtu: mtuSchema.optional(),
  // Admin-only under the default Neutron policy
  shared: z.boolean().optional(),
  "router:external": z.boolean().optional(),
  availability_zone_hints: z.array(z.string().trim().min(1)).optional(),
})

export const NetworkUpdateRequestSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  port_security_enabled: z.boolean().optional(),
  mtu: mtuSchema.optional(),
  // Admin-only under the default Neutron policy; unsharing fails while other projects use the network
  shared: z.boolean().optional(),
  "router:external": z.boolean().optional(),
})

export const NetworkSetTagsRequestSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
  // Replaces ALL tags of the network; [] removes them
  tags: z.array(tagSchema),
})

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Network = z.infer<typeof NetworkSchema>
export type NetworkSubnet = z.infer<typeof NetworkSubnetSchema>

/** A subnet of a network as shown in the list. `name` is undefined when it can't be resolved. */
export interface NetworkSubnetReference {
  id: string
  name?: string
}

/**
 * Network as returned by `list`: the subnet IDs are enriched with subnet names.
 * `subnet_details` mirrors `subnets` (same IDs, same order); names that can't be resolved are left out.
 */
export type NetworkListItem = Network & {
  subnet_details: NetworkSubnetReference[]
}

export type NetworkQueryParameters = z.infer<typeof NetworkQueryParametersSchema>
/** Neutron network sort key, used when re-sorting a merged list server-side. */
export type NetworkNeutronSortKey = z.infer<typeof NetworkSortKeySchema>
export type NetworkCreateRequest = z.infer<typeof NetworkCreateRequestSchema>
export type NetworkUpdateRequest = z.infer<typeof NetworkUpdateRequestSchema>
export type NetworkSetTagsRequest = z.infer<typeof NetworkSetTagsRequestSchema>

import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { ISO8601TimestampSchema, SortDirSchema } from "./index"

/* -------------------------------------------------------------------------- */
/*                                 Primitives                                 */
/* -------------------------------------------------------------------------- */

const resourceIdSchema = z.string().trim().min(1, "ID is required")
const nameSchema = z.string().trim().max(255, "Name must be at most 255 characters")
const descriptionSchema = z.string().max(255, "Description must be at most 255 characters")

/* -------------------------------------------------------------------------- */
/*                         Neutron response schemas                           */
/* -------------------------------------------------------------------------- */

/** Network status values as returned by Neutron */
export const NetworkStatusSchema = z.enum(["ACTIVE", "DOWN", "BUILD", "ERROR"])

/** Subnet information embedded in network responses */
export const NetworkSubnetSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  cidr: z.string().optional(),
  ip_version: z.number().optional(),
  gateway_ip: z.string().nullable().optional(),
  enable_dhcp: z.boolean().optional(),
})

/** Port information embedded in network responses */
export const NetworkPortSummarySchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  device_owner: z.string().optional(),
  status: z.string().optional(),
})

/** OpenStack Network object schema as returned by Neutron API */
export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  project_id: z.string(),
  tenant_id: z.string().optional(),
  status: NetworkStatusSchema,
  admin_state_up: z.boolean(),
  // Network type fields
  shared: z.boolean().default(false),
  // External network marker
  "router:external": z.boolean().optional().default(false),
  // Provider network attributes (read-only, admin-only)
  "provider:network_type": z.string().optional(),
  "provider:physical_network": z.string().nullable().optional(),
  "provider:segmentation_id": z.number().nullable().optional(),
  // MTU
  mtu: z.number().optional(),
  // Availability zones
  availability_zone_hints: z.array(z.string()).optional().default([]),
  availability_zones: z.array(z.string()).optional().default([]),
  // QoS policy
  qos_policy_id: z.string().nullable().optional(),
  // Port security
  port_security_enabled: z.boolean().optional(),
  // DNS domain
  dns_domain: z.string().optional().default(""),
  // L2 adjacency
  l2_adjacency: z.boolean().optional(),
  // VLAN transparency
  vlan_transparent: z.boolean().nullable().optional(),
  // IPv4 address scope
  ipv4_address_scope: z.string().nullable().optional(),
  // IPv6 address scope
  ipv6_address_scope: z.string().nullable().optional(),
  // Subnets list
  subnets: z.array(z.string()).optional().default([]),
  // Tags
  tags: z.array(z.string()).optional().default([]),
  // Revision
  revision_number: z.number().optional(),
  // Timestamps
  created_at: ISO8601TimestampSchema.optional(),
  updated_at: ISO8601TimestampSchema.optional(),
})

/** Response schema for GET /v2.0/networks */
export const NetworkListResponseSchema = z.object({
  networks: z.array(NetworkSchema),
})

/** Response schema for GET /v2.0/networks/{id} */
export const NetworkResponseSchema = z.object({
  network: NetworkSchema,
})

/** Subnet summary for enriching network details */
export const SubnetDetailSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  cidr: z.string().optional(),
  ip_version: z.number(),
  gateway_ip: z.string().nullable().optional(),
  enable_dhcp: z.boolean(),
  allocation_pools: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    )
    .optional()
    .default([]),
  network_id: z.string(),
})

/** Response schema for GET /v2.0/subnets */
export const SubnetListResponseSchema = z.object({
  subnets: z.array(SubnetDetailSchema),
})

/** Port summary for enriching network details */
export const PortDetailSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  device_owner: z.string().optional().default(""),
  device_id: z.string().optional().default(""),
  status: z.string(),
  network_id: z.string(),
  fixed_ips: z
    .array(
      z.object({
        subnet_id: z.string(),
        ip_address: z.string(),
      })
    )
    .optional()
    .default([]),
})

/** Response schema for GET /v2.0/ports */
export const PortListResponseSchema = z.object({
  ports: z.array(PortDetailSchema),
})

/* -------------------------------------------------------------------------- */
/*                              tRPC input schemas                            */
/* -------------------------------------------------------------------------- */

/** Sort keys supported by Neutron for GET /v2.0/networks */
export const NetworkSortKeySchema = z.enum([
  "id",
  "name",
  "status",
  "admin_state_up",
  "mtu",
  "shared",
  "project_id",
  "tenant_id",
])

/** Query parameters for listing networks */
export const NetworkQueryParametersSchema = projectScopedInputSchema.extend({
  // Passed through to Neutron
  name: z.string().optional(),
  status: NetworkStatusSchema.optional(),
  admin_state_up: z.boolean().optional(),
  shared: z.boolean().optional(),
  "router:external": z.boolean().optional(),
  sort_key: NetworkSortKeySchema.optional(),
  sort_dir: SortDirSchema.optional(),
  // Comma-separated tag lists, as Neutron expects
  tags: z.string().optional(),
  tags_any: z.string().optional(),
  not_tags: z.string().optional(),
  not_tags_any: z.string().optional(),
  // Applied BFF-side
  searchTerm: z.string().trim().optional(),
})

/** Input schema for getting a network by ID */
export const NetworkIdInputSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
})

/** Input schema for creating a network */
export const NetworkCreateRequestSchema = projectScopedInputSchema.extend({
  name: nameSchema.min(1, "Name is required"),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional().default(true),
  shared: z.boolean().optional().default(false),
  // Note: setting router:external requires admin privileges in default policy
  "router:external": z.boolean().optional().default(false),
  // Provider network attributes (admin-only)
  "provider:network_type": z.string().optional(),
  "provider:physical_network": z.string().optional(),
  "provider:segmentation_id": z.number().optional(),
  // MTU
  mtu: z.number().int().positive().optional(),
  // Availability zone hints (must be set at creation time)
  availability_zone_hints: z.array(z.string().trim().min(1)).optional(),
  // QoS policy
  qos_policy_id: z.string().nullable().optional(),
  // Port security
  port_security_enabled: z.boolean().optional(),
  // DNS domain
  dns_domain: z.string().optional(),
  // VLAN transparency
  vlan_transparent: z.boolean().optional(),
})

/** Input schema for updating a network */
export const NetworkUpdateRequestSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  shared: z.boolean().optional(),
  // Note: updating router:external requires admin privileges
  "router:external": z.boolean().optional(),
  // Provider network attributes (admin-only, immutable in most deployments)
  "provider:network_type": z.string().optional(),
  "provider:physical_network": z.string().optional(),
  "provider:segmentation_id": z.number().optional(),
  // MTU (some deployments don't allow updates)
  mtu: z.number().int().positive().optional(),
  // QoS policy
  qos_policy_id: z.string().nullable().optional(),
  // Port security
  port_security_enabled: z.boolean().optional(),
  // DNS domain
  dns_domain: z.string().optional(),
})

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Network = z.infer<typeof NetworkSchema>
export type NetworkStatus = z.infer<typeof NetworkStatusSchema>
export type SubnetDetail = z.infer<typeof SubnetDetailSchema>
export type PortDetail = z.infer<typeof PortDetailSchema>
export type NetworkQueryParameters = z.infer<typeof NetworkQueryParametersSchema>
export type NetworkCreateRequest = z.infer<typeof NetworkCreateRequestSchema>
export type NetworkUpdateRequest = z.infer<typeof NetworkUpdateRequestSchema>

/**
 * Network as returned by `list`: basic network info suitable for table display
 */
export type NetworkListItem = Network

/**
 * Network as returned by `getById`: enriched with subnet and port details
 */
export interface NetworkDetails extends Network {
  /** Associated subnets, resolved from the subnets array */
  subnet_details?: SubnetDetail[]
  /** Associated ports (optional, can be fetched separately) */
  port_details?: PortDetail[]
}

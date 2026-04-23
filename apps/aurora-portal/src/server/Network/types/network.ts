import { z } from "zod"
import { ISO8601TimestampSchema, NetworkPortStatusSchema, SortDirSchema } from "./index"

/**
 * Query schema for OpenStack Neutron:
 * GET /v2.0/networks
 *
 * Reference:
 * https://docs.openstack.org/api-ref/network/v2/index.html#list-networks
 *
 * Notes:
 * - Keys like "router:external" and "provider:network_type" must be accessed
 *   with bracket notation due to ":" in the key.
 * - This schema is intentionally permissive for string-valued filters that
 *   may vary by deployment/extensions.
 */
export const ListNetworksQuerySchema = z.object({
  admin_state_up: z.boolean().optional(),
  id: z.string().optional(),
  mtu: z.number().int().optional(),
  name: z.string().optional(),
  project_id: z.string().optional(),
  "provider:network_type": z.string().optional(),
  "provider:physical_network": z.string().optional(),
  "provider:segmentation_id": z.number().int().optional(),
  revision_number: z.number().int().optional(),
  "router:external": z.boolean().optional(),
  shared: z.boolean().optional(),
  status: z.string().optional(),
  tenant_id: z.string().optional(),
  vlan_transparent: z.boolean().optional(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  tags: z.string().optional(),
  "tags-any": z.string().optional(),
  "not-tags": z.string().optional(),
  "not-tags-any": z.string().optional(),
  sort_dir: SortDirSchema.optional(),
  sort_key: z.string().optional(),
  fields: z.string().optional(),
})

/**
 * Query schema for external networks only:
 * GET /v2.0/networks?router:external=true
 *
 * This keeps all standard list filters available, but enforces
 * "router:external" to be true.
 *
 * Now requires project_id for use with projectScopedProcedure.
 */
export const ListExternalNetworksQuerySchema = ListNetworksQuerySchema.extend({
  project_id: z.string(),
  "router:external": z.literal(true).default(true),
})

/**
 * Query schema for listing DNS domains derived from networks:
 * GET /v2.0/networks?fields=dns_domain
 *
 * Keeps only useful network-level filters for this procedure.
 *
 * Now requires project_id for use with projectScopedProcedure.
 */
export const ListDnsDomainsQuerySchema = z.object({
  project_id: z.string(),
  tenant_id: z.string().optional(),
  "router:external": z.boolean().optional(),
})

/**
 * Provider network segment descriptor.
 *
 * Returned for routed/provider-backed networks when segment data is exposed
 * by the deployment.
 */
const SegmentSchema = z.object({
  "provider:network_type": z.string(),
  "provider:physical_network": z.string(),
  "provider:segmentation_id": z.number().int(),
})

/**
 * OpenStack Neutron network resource schema.
 *
 * Reference:
 * https://docs.openstack.org/api-ref/network/v2/index.html#networks
 *
 * Notes:
 * - Includes core fields plus optional extension-driven attributes.
 * - `created_at`/`updated_at` use the shared timestamp brand schema.
 * - Keys containing ":" should be accessed via bracket notation.
 */
export const NetworkSchema = z.object({
  admin_state_up: z.boolean(),
  availability_zone_hints: z.array(z.string()).optional(),
  availability_zones: z.array(z.string()).optional(),
  created_at: ISO8601TimestampSchema,
  dns_domain: z.string().optional(),
  id: z.string(),
  ipv4_address_scope: z.string().optional(),
  ipv6_address_scope: z.string().optional(),
  l2_adjacency: z.boolean().optional(),
  mtu: z.number().int(),
  name: z.string(),
  port_security_enabled: z.boolean(),
  project_id: z.string(),
  "provider:network_type": z.string().optional(),
  "provider:physical_network": z.string().optional(),
  "provider:segmentation_id": z.number().int().optional(),
  qos_policy_id: z.string().optional(),
  revision_number: z.number().int().optional(),
  "router:external": z.boolean(),
  segments: z.array(SegmentSchema).optional(),
  shared: z.boolean(),
  status: NetworkPortStatusSchema,
  subnets: z.array(z.string()).optional(),
  tenant_id: z.string(),
  updated_at: ISO8601TimestampSchema.optional(),
  vlan_transparent: z.boolean().optional(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Network list response wrapper.
 * Contains an array of network objects.
 * Used by GET /v2.0/networks (list networks), including
 * external-network queries such as `?router:external=true`.
 */
export const NetworkListResponseSchema = z.object({
  networks: z.array(NetworkSchema),
})

/**
 * Minimal network shape when requesting only `fields=dns_domain`.
 */
export const NetworkDnsDomainItemSchema = z.object({
  dns_domain: z.string().optional(),
})

/**
 * DNS-domain list response wrapper.
 * Used by GET /v2.0/networks?fields=dns_domain.
 */
export const NetworkDnsDomainListResponseSchema = z.object({
  networks: z.array(NetworkDnsDomainItemSchema),
})

export type ListNetworksQuery = z.infer<typeof ListNetworksQuerySchema>
export type ListExternalNetworksQuery = z.infer<typeof ListExternalNetworksQuerySchema>
export type ListDnsDomainsQuery = z.infer<typeof ListDnsDomainsQuerySchema>
export type Network = z.infer<typeof NetworkSchema>
export type NetworkListResponse = z.infer<typeof NetworkListResponseSchema>
export type NetworkDnsDomainListResponse = z.infer<typeof NetworkDnsDomainListResponseSchema>

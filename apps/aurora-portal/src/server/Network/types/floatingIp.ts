import { z } from "zod"

/** ISO8601 timestamp string (UTC format) */
export const ISO8601TimestampSchema = z.string().brand("ISO8601Timestamp")
/** The status of the floating IP. Values are ACTIVE, DOWN and ERROR. */
export const FloatingIpStatusSchema = z.enum(["ACTIVE", "DOWN", "ERROR"])

/**
 * Represents the details of a port associated with a floating IP.
 *
 * This type is available when the `fip-port-details` extension is enabled.
 */
export const PortDetailsSchema = z.object({
  /** The status of the port */
  status: FloatingIpStatusSchema,
  /** The name of the port */
  name: z.string(),
  /** Administrative state of the port (true = UP, false = DOWN) */
  admin_state_up: z.boolean(),
  /** The ID of the network the port is attached to */
  network_id: z.string(),
  /** The owner of the port device */
  device_owner: z.string(),
  /** The MAC address of the port */
  mac_address: z.string(),
  /** The ID of the device the port is attached to */
  device_id: z.string(),
})

/**
 * Represents a port forwarding rule associated with a floating IP.
 *
 * This type is available when the `expose-port-forwarding-in-fip` extension is enabled.
 * The `floating-ip-port-forwarding-detail` extension adds the `id` and `internal_port_id` attributes.
 * The `floating-ip-port-forwarding-port-ranges` extension adds support for `internal_port_range` and `external_port_range`.
 */
export const PortForwardingSchema = z.object({
  /** Port forwarding protocol  */
  protocol: z.enum(["tcp", "udp"]),
  /** The internal fixed IP address associated with the port forwarding */
  internal_ip_address: z.string(),
  /** The internal port number or starting port of the range */
  internal_port: z.number().optional(),
  /** The internal port range (e.g., "1024:2048") */
  internal_port_range: z.string().optional(),
  /** The internal port ID for the port forwarding (requires floating-ip-port-forwarding-detail extension) */
  internal_port_id: z.string().optional(),
  /** The external port number or starting port of the range */
  external_port: z.number().optional(),
  /** The external port range (e.g., "8000:9000") */
  external_port_range: z.string().optional(),
  /** The ID of the port forwarding resource */
  id: z.string(),
  /** Description of the port forwarding rule (requires floating-ip-port-forwarding-description extension) */
  description: z.string().nullable().optional(),
})

/**
 * Floating IP response entity.
 *
 * Supported by extensions:
 * - `dns-integration`: adds dns_name and dns_domain
 * - `floating-ip-distributed`: adds distributed
 * - `fip-port-details`: adds port_details
 * - `expose-port-forwarding-in-fip`: adds port_forwardings
 * - `qos` and `qos-fip`: adds qos_policy_id and qos_network_policy_id
 * - `standard-attr-timestamp`: adds created_at and updated_at
 * - `standard-attr-tag`: adds tags
 */
export const FloatingIpSchema = z.object({
  /** The ID of the router for the floating IP (null if not associated) */
  router_id: z.string().nullable(),
  /** A human-readable description for the resource */
  description: z.string().nullable().optional(),
  /** Whether this is a distributed floating IP (requires floating-ip-distributed extension) */
  distributed: z.boolean().optional(),
  /** A valid DNS domain (requires dns-integration extension) */
  dns_domain: z.string().optional(),
  /** A valid DNS name (requires dns-integration extension) */
  dns_name: z.string().optional(),
  /** Time at which the resource was created (UTC ISO8601 format, requires standard-attr-timestamp extension) */
  created_at: ISO8601TimestampSchema.optional(),
  /** Time at which the resource was last updated (UTC ISO8601 format, requires standard-attr-timestamp extension) */
  updated_at: ISO8601TimestampSchema.optional(),
  /** The revision number of the resource (set by server, for concurrency control) */
  revision_number: z.number(),
  /** The ID of the project that owns the floating IP */
  project_id: z.string(),
  /** The ID of the tenant (deprecated, use project_id) */
  tenant_id: z.string(),
  /** The ID of the network associated with the floating IP */
  floating_network_id: z.string(),
  /** The fixed IP address associated with the floating IP (null if not associated) */
  fixed_ip_address: z.string().nullable(),
  /** The floating IP address */
  floating_ip_address: z.string(),
  /** The ID of the port associated with the floating IP (null if not associated) */
  port_id: z.string().nullable(),
  /** The ID of the floating IP address */
  id: z.string(),
  /** The status of the floating IP */
  status: FloatingIpStatusSchema,
  /** The information of the associated port (null if not associated, requires fip-port-details extension) */
  port_details: PortDetailsSchema.nullable().optional(),
  /** The list of tags on the resource (requires standard-attr-tag extension) */
  tags: z.array(z.string()).optional(),
  /** The associated port forwarding resources for the floating IP (requires expose-port-forwarding-in-fip extension) */
  port_forwardings: z.array(PortForwardingSchema).nullish(),
  /** The ID of the QoS policy of the network where this floating IP is plugged (requires qos-fip extension) */
  qos_network_policy_id: z.string().optional(),
  /** The ID of the QoS policy associated with the floating IP (requires qos extension) */
  qos_policy_id: z.string().optional(),
})

/**
 * Floating IPs list response wrapper.
 * Contains an array of floating IP objects.
 */
export const FloatingIpResponseSchema = z.object({
  /** A list of floating IP objects */
  floatingips: z.array(FloatingIpSchema),
})

export const FloatingIpByIdInputSchema = z.object({
  floatingip_id: z.string(),
})

/**
 * Query parameters for listing floating IPs.
 * Supports filtering by various attributes.
 * See https://docs.openstack.org/api-ref/network/v2/index.html#list-floating-ips
 */
export const FloatingIpQueryParametersSchema = z.object({
  /** Filter by the ID of the floating IP */
  id: z.string().optional(),
  /** Filter by the ID of the router for the floating IP */
  router_id: z.string().nullable().optional(),
  /** Filter by the status of the floating IP */
  status: FloatingIpStatusSchema.optional(),
  /** Filter by the ID of the project that owns the resource */
  tenant_id: z.string().optional(),
  /** Filter by the ID of the project that owns the resource */
  project_id: z.string().optional(),
  /** Filter by the revision number of the resource */
  revision_number: z.number().optional(),
  /** Filter by the human-readable description of the resource */
  description: z.string().nullable().optional(),
  /** Filter by the ID of the network associated with the floating IP */
  floating_network_id: z.string().optional(),
  /** Filter by the fixed IP address associated with the floating IP */
  fixed_ip_address: z.string().optional(),
  /** Filter by the floating IP address */
  floating_ip_address: z.string().optional(),
  /** Filter by the ID of a port associated with the floating IP */
  port_id: z.string().nullable().optional(),
  /** Sort direction (asc or desc) */
  sort_dir: z.enum(["asc", "desc"]).optional(),
  /** Sort key - valid keys: fixed_ip_address, floating_ip_address, floating_network_id, id, router_id, status, tenant_id, project_id */
  sort_key: z
    .enum([
      "fixed_ip_address",
      "floating_ip_address",
      "floating_network_id",
      "id",
      "router_id",
      "status",
      "tenant_id",
      "project_id",
    ])
    .optional(),
  /** Filter by tags (comma-separated, resources must match all tags) -  requires standard-attr-tag extension */
  tags: z.array(z.string()).optional(),
  /** Filter by tags with OR logic (comma-separated, resources match any tag) */
  "tags-any": z.string().optional(),
  /** Exclude resources with these tags (comma-separated, resources must match all excluded tags) */
  "not-tags": z.string().optional(),
  /** Exclude resources with these tags using OR logic (comma-separated, resources match any excluded tag) */
  "not-tags-any": z.string().optional(),
  /** Specific fields to return (can be repeated) */
  fields: z.union([z.string(), z.array(z.string())]).optional(),
  /** Pagination limit */
  limit: z.number().optional(),
  /** Pagination marker (ID of the last item in the previous list) */
  marker: z.string().optional(),
  /** Pagination direction (false = ascending, true = descending) */
  page_reverse: z.boolean().optional(),

  // BFF-side search (filtered in BFF layer, not sent to OpenStack)
  searchTerm: z.string().optional(),
})

export type ISO8601Timestamp = z.infer<typeof ISO8601TimestampSchema>
export type FloatingIpStatus = z.infer<typeof FloatingIpStatusSchema>
export type PortDetails = z.infer<typeof PortDetailsSchema>
export type PortForwarding = z.infer<typeof PortForwardingSchema>
export type FloatingIp = z.infer<typeof FloatingIpSchema>
export type FloatingIpResponse = z.infer<typeof FloatingIpResponseSchema>
export type FloatingIpQueryParameters = z.infer<typeof FloatingIpQueryParametersSchema>
export type GetFloatingIpByIdInput = z.infer<typeof FloatingIpByIdInputSchema>

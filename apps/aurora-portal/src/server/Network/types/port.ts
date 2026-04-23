import { z } from "zod"
import { ISO8601TimestampSchema, NetworkPortStatusSchema, SortDirSchema } from "./index"
import { securityGroupSchema } from "./securityGroup"

const FixedIpFilterSchema = z.object({
  ip_address: z.string().optional(),
  ip_address_substr: z.string().optional(),
  subnet_id: z.string().optional(),
})

const SortKeys = z.enum([
  "admin_state_up",
  "device_id",
  "device_owner",
  "id",
  "ip_allocation",
  "mac_address",
  "name",
  "network_id",
  "project_id",
  "status",
  "tenant_id",
])

type SortKeys = z.infer<typeof SortKeys>

/**
 * Query parameters for listing ports.
 * Supports filtering, sorting, and pagination.
 * See https://docs.openstack.org/api-ref/network/v2/index.html#list-ports
 */
const ListPortsQuerySchema = z.object({
  /** Filter by administrative state (true = UP, false = DOWN) */
  admin_state_up: z.boolean().optional(),
  /** Filter by host ID where the port resides (requires binding extension) */
  "binding:host_id": z.string().optional(),
  /** Filter by human-readable description */
  description: z.string().optional(),
  /** Filter by device ID (e.g. server instance, router) */
  device_id: z.string().optional(),
  /** Filter by entity type using the device_owner attribute (e.g. compute:nova, network:dhcp, network:router_interface) */
  device_owner: z.string().optional(),
  /** Filter by IP addresses, substrings, or subnet IDs */
  fixed_ips: z.array(FixedIpFilterSchema).optional(),
  /** Filter by the ID of the resource. Can be repeated to match multiple IDs */
  id: z.union([z.string(), z.array(z.string())]).optional(),
  /** Filter by IP allocation mode */
  ip_allocation: z.enum(["deferred", "immediate", "none"]).optional(),
  /** Filter by MAC address */
  mac_address: z.string().optional(),
  /** Filter by human-readable name of the resource */
  name: z.string().optional(),
  /** Filter by the ID of the attached network */
  network_id: z.string().optional(),
  /** Filter by the ID of the project that owns the resource */
  project_id: z.string().optional(),
  /** Filter by revision number */
  revision_number: z.number().optional(),
  /** Sort direction (asc or desc). Can be repeated, must match count of sort_key values */
  sort_dir: z.union([SortDirSchema, z.array(SortDirSchema)]).optional(),
  /** Sort by port attribute(s). Can be repeated; each sort_key must have a corresponding sort_dir */
  sort_key: z.union([SortKeys, z.array(SortKeys)]).optional(),
  /** Filter by port status */
  status: z.enum(["ACTIVE", "DOWN", "BUILD", "ERROR"]).optional(),
  /** Filter by the ID of the project that owns the resource (deprecated, use project_id) */
  tenant_id: z.string().optional(),
  /** Filter by tags (comma-separated). Resources must match ALL tags - requires standard-attr-tag extension */
  tags: z.string().optional(),
  /** Filter by tags (comma-separated). Resources match ANY tag - requires standard-attr-tag extension */
  "tags-any": z.string().optional(),
  /** Exclude resources matching ALL of these tags (comma-separated) - requires standard-attr-tag extension */
  "not-tags": z.string().optional(),
  /** Exclude resources matching ANY of these tags (comma-separated) - requires standard-attr-tag extension */
  "not-tags-any": z.string().optional(),
  /** Specific fields to return. Can be repeated (e.g. ?fields=id&fields=name) */
  fields: z.union([z.string(), z.array(z.string())]).optional(),
  /** Filter by mac_learning_enabled state */
  mac_learning_enabled: z.boolean().optional(),
  /** Pagination: maximum number of items to return */
  limit: z.number().int().positive().optional(),
  /** Pagination: ID of the last item in the previous page */
  marker: z.string().optional(),
  /** Pagination: if true, returns items in reverse order */
  page_reverse: z.boolean().optional(),
})

/**
 * Query parameters for listing ports eligible for floating IP association.
 *
 * Extends {@link ListPortsQuerySchema} with opinionated defaults:
 * - `status` is locked to `"ACTIVE"` — only operational ports can be associated
 * - `admin_state_up` is locked to `true` — only administratively enabled ports are eligible
 *
 * Now requires project_id for use with projectScopedProcedure.
 *
 * Used by the floating IP association dropdown.
 */
export const ListAvailablePortsQuerySchema = ListPortsQuerySchema.extend({
  project_id: z.string(),
  /** Only ACTIVE ports are eligible for floating IP association */
  status: z.literal("ACTIVE").default("ACTIVE"),
  /** Only administratively UP ports are eligible for floating IP association */
  admin_state_up: z.literal(true).default(true),
})

/**
 * Allowed address pair on a port.
 * Enables traffic from additional IP/MAC pairs beyond the port's own address.
 */
const AllowedAddressPairSchema = z.object({
  /** IP address or CIDR (required) */
  ip_address: z.string(),
  /** MAC address (optional; defaults to port MAC if omitted) */
  mac_address: z.string().optional(),
})

/**
 * VIF details for a port binding.
 * Describes the plugging mechanism used by the compute host.
 */
const BindingVifDetailsSchema = z.record(z.string(), z.unknown())

/**
 * DNS assignment entry for a port.
 * Available when the dns-integration extension is enabled.
 */
const DnsAssignmentSchema = z.object({
  /** Short hostname */
  hostname: z.string(),
  /** Assigned IP address */
  ip_address: z.string(),
  /** Fully qualified domain name */
  fqdn: z.string(),
})

/**
 * Extra DHCP option applied to a port.
 * Allows passing custom DHCP options to instances.
 */
const ExtraDhcpOptSchema = z.object({
  /** DHCP option value */
  opt_value: z.string(),
  /** IP version (4 or 6) */
  ip_version: z.number(),
  /** DHCP option name */
  opt_name: z.string(),
})

/**
 * Fixed IP assignment on a port.
 * Each entry pairs an IP address with its subnet.
 */
const FixedIpSchema = z.object({
  /** The fixed IP address assigned to the port */
  ip_address: z.string(),
  /** The ID of the subnet the IP belongs to */
  subnet_id: z.string().optional(),
})

/**
 * Admin-only hints for Open vSwitch Userspace Tx packet steering.
 * See https://docs.openstack.org/api-ref/network/v2/index.html#port-hint-open-vswitch-tx-steering
 */
const HintsSchema = z.record(z.string(), z.unknown())

/**
 * Resource request associated with a port for the placement API.
 * Used when a port requires specific resources (e.g. SR-IOV, NUMA affinity).
 * See https://docs.openstack.org/api-ref/network/v2/index.html#port-resource-request-groups
 */
const ResourceRequestSchema = z.union([
  // New format from port-resource-request-groups extension.
  z.object({
    request_groups: z.array(
      z.object({
        /** Unique UUID identifying this request group */
        id: z.string().uuid(),
        /** Required traits (e.g. CUSTOM_VNIC_TYPE_NORMAL) */
        required: z.array(z.string()),
        /** Map of resource class name to requested amount */
        resources: z.record(z.string(), z.number()),
      })
    ),
    /** IDs of request groups that must be fulfilled from the same resource subtree */
    same_subtree: z.array(z.string().uuid()),
  }),
  // Legacy format still seen in some deployments.
  z.object({
    required: z.array(z.string()).optional(),
    resources: z.record(z.string(), z.number()).optional(),
  }),
])

/**
 * Port response entity.
 *
 * Supported by extensions:
 * - `binding`: adds binding:host_id, binding:profile, binding:vif_details, binding:vif_type, binding:vnic_type
 * - `dns-integration`: adds dns_assignment, dns_domain, dns_name
 * - `port-hints`: adds hints (admin only)
 * - `port-resource-request`: adds resource_request
 * - `qos`: adds qos_policy_id, qos_network_policy_id
 * - `standard-attr-timestamp`: adds created_at, updated_at
 * - `standard-attr-tag`: adds tags
 * - `mac-learning`: adds mac_learning_enabled
 * - `uplink-status-propagation`: adds propagate_uplink_status
 * - `numa-networks`: adds numa_affinity_policy
 */
export const PortSchema = z.object({
  /** Administrative state of the port (true = UP, false = DOWN) */
  admin_state_up: z.boolean(),
  /** Additional IP/MAC pairs allowed to send traffic through this port */
  allowed_address_pairs: z.array(AllowedAddressPairSchema).optional(),
  /** ID of the host where the port is bound (requires binding extension) */
  "binding:host_id": z.string().optional(),
  /** Port binding profile; custom data passed to the bound VIF driver (requires binding extension) */
  "binding:profile": z.record(z.string(), z.any()).optional(),
  /** VIF driver details for the bound port (requires binding extension) */
  "binding:vif_details": BindingVifDetailsSchema.optional(),
  /** Type of the VIF binding (requires binding extension) */
  "binding:vif_type": z
    .enum([
      "ovs",
      "bridge",
      "macvtap",
      "hw_veb",
      "hostdev_physical",
      "vhostuser",
      "distributed",
      "other",
      "unbound",
      "binding_failed",
    ])
    .optional(),
  /** VNIC type requested for the port (e.g. normal, direct, macvtap — requires binding extension) */
  "binding:vnic_type": z.string().optional(),
  /** Time at which the port was created (UTC ISO8601, requires standard-attr-timestamp extension) */
  created_at: z.string().optional(),
  /** Data plane status of the port (requires data-plane-status extension) */
  data_plane_status: z.string().optional(),
  /** Human-readable description of the port */
  description: z.string().nullable().optional(),
  /** ID of the device (e.g. server instance, router) the port is attached to */
  device_id: z.string().nullable().optional(),
  /** Entity type that owns the port (e.g. compute:nova, network:router_interface) */
  device_owner: z.string().nullable().optional(),
  /** DNS assignment entries for the port (requires dns-integration extension) */
  dns_assignment: z.array(DnsAssignmentSchema).optional(),
  /** DNS domain for the port (requires dns-integration extension) */
  dns_domain: z.string().optional(),
  /** DNS name for the port (requires dns-integration extension) */
  dns_name: z.string().optional(),
  /** Extra DHCP options applied to the port */
  extra_dhcp_opts: z.array(ExtraDhcpOptSchema).optional(),
  /** List of fixed IPs assigned to the port */
  fixed_ips: z.array(FixedIpSchema).optional(),
  /** Admin-only TX steering hints for Open vSwitch (requires port-hints extension) */
  hints: HintsSchema.optional(),
  /** The ID of the port */
  id: z.string(),
  /** IP allocation mode for the port */
  ip_allocation: z.enum(["deferred", "immediate", "none"]).optional(),
  /** MAC address of the port */
  mac_address: z.string().optional(),
  /** Human-readable name of the port */
  name: z.string().nullable().optional(),
  /** ID of the network the port belongs to */
  network_id: z.string().optional(),
  /** NUMA affinity policy for the port (requires numa-networks extension) */
  numa_affinity_policy: z.enum(["None", "required", "preferred", "legacy"]).optional(),
  /** Whether port security (anti-spoofing and security groups) is enabled */
  port_security_enabled: z.boolean().optional(),
  /** ID of the project that owns the port */
  project_id: z.string().optional(),
  /** ID of the QoS policy of the network where this port is plugged (requires qos extension) */
  qos_network_policy_id: z.string().nullable().optional(),
  /** ID of the QoS policy associated directly with the port (requires qos extension) */
  qos_policy_id: z.string().nullable().optional(),
  /** Revision number of the port (used for optimistic concurrency control) */
  revision_number: z.number().optional(),
  /** Placement API resource request for this port (requires port-resource-request extension) */
  resource_request: ResourceRequestSchema.optional(),
  /** Security groups applied to the port */
  security_groups: z.array(z.union([z.string(), securityGroupSchema])).optional(),
  /** Status of the port */
  status: NetworkPortStatusSchema.optional(),
  /** List of tags on the port (requires standard-attr-tag extension) */
  tags: z.array(z.string()).optional(),
  /** ID of the project that owns the port (deprecated, use project_id) */
  tenant_id: z.string().optional(),
  /** Time at which the port was last updated (UTC ISO8601, requires standard-attr-timestamp extension) */
  updated_at: ISO8601TimestampSchema.optional(),
  /** Whether uplink status propagation is enabled (requires uplink-status-propagation extension) */
  propagate_uplink_status: z.boolean().optional(),
  /** Whether MAC learning is enabled on the port (requires mac-learning extension) */
  mac_learning_enabled: z.boolean().optional(),
  /** Whether the port is trusted (admin-only, for SR-IOV/NFV use cases) */
  port_trusted_vif: z.boolean().optional(),
})

/**
 * Optimized port schema for listing available ports.
 * Contains only essential fields for floating IP association:
 * - `id`: Port identifier
 * - `name`: Port display name
 * - `fixed_ips`: Fixed IP assignments
 *
 * Used by GET /v2.0/ports with fields filter (id, name, fixed_ips).
 * See https://docs.openstack.org/api-ref/network/v2/index.html#ports
 */
export const AvailablePortSchema = z.object({
  /** The ID of the port */
  id: z.string(),
  /** Human-readable name of the port */
  name: z.string().nullable().optional(),
  /** List of fixed IPs assigned to the port */
  fixed_ips: z.array(FixedIpSchema).optional(),
})

/**
 * Ports list response wrapper.
 * Contains an array of ports objects.
 * Used by GET /v2.0/ports (list ports).
 */
export const PortListResponseSchema = z.object({
  /** A list of port objects */
  ports: z.array(PortSchema),
})

/**
 * Available ports list response wrapper.
 * Optimized response for floating IP association featuring only essential port fields.
 * Used by GET /v2.0/ports (list ports) with fields filter.
 */
export const AvailablePortListResponseSchema = z.object({
  /** A list of available port objects */
  ports: z.array(AvailablePortSchema),
})

export type ListPortsQuery = z.infer<typeof ListPortsQuerySchema>
export type ListAvailablePortsQuery = z.infer<typeof ListAvailablePortsQuerySchema>
export type Port = z.infer<typeof PortSchema>
export type AvailablePort = z.infer<typeof AvailablePortSchema>
export type PortListResponse = z.infer<typeof PortListResponseSchema>
export type AvailablePortListResponse = z.infer<typeof AvailablePortListResponseSchema>

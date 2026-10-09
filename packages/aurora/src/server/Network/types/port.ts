import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { ISO8601TimestampSchema, SortDirSchema } from "./index"
import { isValidCidr, isValidIpAddress } from "./router"

/* -------------------------------------------------------------------------- */
/*                                 Primitives                                 */
/* -------------------------------------------------------------------------- */

/** An IP address or a CIDR, as accepted by allowed address pairs. */
export const isValidIpAddressOrCidr = (value: string): boolean =>
  value.includes("/") ? isValidCidr(value) : isValidIpAddress(value)

export const isValidMacAddress = (value: string): boolean => /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(value)

const resourceIdSchema = z.string().trim().min(1, "ID is required")
const ipAddressSchema = z.string().trim().refine(isValidIpAddress, { message: "Must be a valid IPv4 or IPv6 address" })
const ipAddressOrCidrSchema = z
  .string()
  .trim()
  .refine(isValidIpAddressOrCidr, { message: "Must be a valid IP address or CIDR, e.g. 10.0.0.5 or 10.0.0.0/24" })
const macAddressSchema = z
  .string()
  .trim()
  .refine(isValidMacAddress, { message: "Must be a valid MAC address, e.g. fa:16:3e:50:a2:79" })
const nameSchema = z.string().trim().max(255, "Name must be at most 255 characters")
const descriptionSchema = z.string().max(255, "Description must be at most 255 characters")

/* -------------------------------------------------------------------------- */
/*                         Neutron response schemas                           */
/* -------------------------------------------------------------------------- */

export const PortFixedIpSchema = z.object({
  subnet_id: z.string(),
  ip_address: z.string(),
})

export const AllowedAddressPairSchema = z.object({
  ip_address: z.string(),
  mac_address: z.string().optional(),
})

export const PortSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  network_id: z.string(),
  mac_address: z.string(),
  admin_state_up: z.boolean(),
  // Plain string: Neutron documents ACTIVE, DOWN, BUILD and ERROR, but some backends report other values (e.g. N/A)
  status: z.string(),
  // Empty string when the port is not attached to a device
  device_id: z.string().optional().default(""),
  device_owner: z.string().optional().default(""),
  fixed_ips: z.array(PortFixedIpSchema).optional().default([]),
  // Security group IDs. Only present when the `security-group` extension is enabled
  security_groups: z.array(z.string()).optional().default([]),
  // Only present when the `allowed-address-pairs` extension is enabled
  allowed_address_pairs: z.array(AllowedAddressPairSchema).optional().default([]),
  // Only present when the `port-security` extension is enabled
  port_security_enabled: z.boolean().nullish(),
  // Only present when the `dns-integration` extension is enabled
  dns_name: z.string().nullish(),
  // Only present when the `qos` extension is enabled
  qos_policy_id: z.string().nullish(),
  // Port binding attributes (`binding` extension); most are admin-only under the default policy
  "binding:vnic_type": z.string().nullish(),
  "binding:host_id": z.string().nullish(),
  project_id: z.string(),
  tenant_id: z.string().optional(),
  revision_number: z.number().optional(),
  tags: z.array(z.string()).optional(),
  created_at: ISO8601TimestampSchema.optional(),
  updated_at: ISO8601TimestampSchema.optional(),
})

export const PortListResponseSchema = z.object({
  ports: z.array(PortSchema),
})

export const PortResponseSchema = z.object({
  port: PortSchema,
})

/* -------------------------------------------------------------------------- */
/*                              tRPC input schemas                            */
/* -------------------------------------------------------------------------- */

/** Sort keys supported by Neutron for GET /v2.0/ports */
export const PortSortKeySchema = z.enum([
  "admin_state_up",
  "device_id",
  "device_owner",
  "id",
  "mac_address",
  "name",
  "network_id",
  "project_id",
  "status",
  "tenant_id",
])

export const PortQueryParametersSchema = projectScopedInputSchema.extend({
  // Passed through to Neutron
  network_id: resourceIdSchema.optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  admin_state_up: z.boolean().optional(),
  device_id: z.string().optional(),
  device_owner: z.string().optional(),
  mac_address: z.string().optional(),
  sort_key: PortSortKeySchema.optional(),
  sort_dir: SortDirSchema.optional(),
  // Comma-separated tag lists, as Neutron expects
  tags: z.string().optional(),
  tags_any: z.string().optional(),
  not_tags: z.string().optional(),
  not_tags_any: z.string().optional(),
  // Applied BFF-side: matches ID, name, description, network, IPs, subnets, MAC and device
  searchTerm: z.string().trim().optional(),
})

export const PortIdInputSchema = projectScopedInputSchema.extend({
  port_id: resourceIdSchema,
})

export const PortFixedIpInputSchema = z
  .object({
    subnet_id: resourceIdSchema.optional(),
    ip_address: ipAddressSchema.optional(),
  })
  .refine((value) => Boolean(value.subnet_id || value.ip_address), {
    message: "Either subnet_id or ip_address is required",
  })

export const AllowedAddressPairInputSchema = z.object({
  ip_address: ipAddressOrCidrSchema,
  mac_address: macAddressSchema.optional(),
})

/** Fields that can be set on create and changed on update */
const portWritableFields = {
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  // Omitted: Neutron allocates an IP from every subnet of the network. []: no IP at all.
  fixed_ips: z.array(PortFixedIpInputSchema).optional(),
  // Security group IDs; replaces the full list on update
  security_groups: z.array(resourceIdSchema).optional(),
  port_security_enabled: z.boolean().optional(),
  // Replaces the full list on update
  allowed_address_pairs: z.array(AllowedAddressPairInputSchema).optional(),
  device_id: z.string().trim().optional(),
  device_owner: z.string().trim().optional(),
  dns_name: z.string().trim().optional(),
  qos_policy_id: resourceIdSchema.nullable().optional(),
}

export const PortCreateRequestSchema = projectScopedInputSchema.extend({
  network_id: resourceIdSchema,
  // Neutron generates a MAC address when omitted; it can't be changed by regular users afterwards
  mac_address: macAddressSchema.optional(),
  ...portWritableFields,
})

export const PortUpdateRequestSchema = projectScopedInputSchema.extend({
  port_id: resourceIdSchema,
  ...portWritableFields,
})

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Port = z.infer<typeof PortSchema>
export type PortFixedIp = z.infer<typeof PortFixedIpSchema>
export type AllowedAddressPair = z.infer<typeof AllowedAddressPairSchema>

export type PortQueryParameters = z.infer<typeof PortQueryParametersSchema>
export type PortFixedIpInput = z.infer<typeof PortFixedIpInputSchema>
export type AllowedAddressPairInput = z.infer<typeof AllowedAddressPairInputSchema>
export type PortCreateRequest = z.infer<typeof PortCreateRequestSchema>
export type PortUpdateRequest = z.infer<typeof PortUpdateRequestSchema>

/** A fixed IP as returned to the UI: enriched with the IP version and the subnet name. */
export interface PortFixedIpItem extends PortFixedIp {
  /** Derived from the address; undefined if Neutron returned something that is not an IP */
  ip_version?: 4 | 6
  /** Undefined when the subnet name can't be resolved */
  subnet_name?: string
}

/** A security group referenced by a port. */
export interface SecurityGroupRef {
  id: string
  /** Undefined when the security group name can't be resolved */
  name?: string
}

/**
 * Port as returned by `list`: enriched with the network name and the IP version and subnet name of every fixed IP.
 * Names are undefined when they can't be resolved.
 */
export type PortListItem = Omit<Port, "fixed_ips"> & {
  network_name?: string
  fixed_ips: PortFixedIpItem[]
}

/** Port as returned by `getById`: like `PortListItem`, with security group IDs resolved to references with names. */
export type PortDetails = Omit<PortListItem, "security_groups"> & {
  security_groups: SecurityGroupRef[]
}

import { z } from "zod"
import { SortDirSchema } from "./index"

/**
 * Validates CIDR notation for IPv4 and IPv6 addresses.
 * - IPv4: octets must be 0-255, prefix length must be 0-32
 * - IPv6: proper hexadecimal format with colons, prefix length must be 0-128
 */
function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split("/")
  if (parts.length !== 2) {
    return false
  }

  const [address, prefixStr] = parts
  const prefix = parseInt(prefixStr, 10)

  // Check if prefix is a valid number
  if (isNaN(prefix) || prefix < 0) {
    return false
  }

  // Check for IPv4
  if (address.includes(".")) {
    // Validate IPv4 address format
    const octets = address.split(".")
    if (octets.length !== 4) {
      return false
    }

    // Validate each octet is 0-255
    for (const octet of octets) {
      const num = parseInt(octet, 10)
      if (isNaN(num) || num < 0 || num > 255 || octet !== num.toString()) {
        return false
      }
    }

    // Validate prefix length for IPv4 (0-32)
    return prefix <= 32
  }

  // Check for IPv6
  if (address.includes(":")) {
    // Validate prefix length for IPv6 (0-128)
    if (prefix > 128) {
      return false
    }

    // Basic IPv6 validation
    // Allow :: for compressed zeros
    const hasDoubleColon = address.includes("::")
    const segments = address.split(":").filter((s) => s !== "")

    // IPv6 should have at most 8 segments (or fewer if :: is used)
    if (hasDoubleColon) {
      // With ::, we can have 0-7 segments
      if (segments.length > 7) {
        return false
      }
    } else {
      // Without ::, we must have exactly 8 segments
      if (segments.length !== 8) {
        return false
      }
    }

    // Validate each segment is valid hex (0-ffff)
    for (const segment of segments) {
      if (segment.length === 0 || segment.length > 4) {
        return false
      }
      if (!/^[0-9a-fA-F]+$/.test(segment)) {
        return false
      }
    }

    // Check for valid :: usage (only one occurrence)
    const doubleColonCount = (address.match(/::/g) || []).length
    if (doubleColonCount > 1) {
      return false
    }

    // Check for leading/trailing single colons (invalid unless part of ::)
    if (address.startsWith(":") && !address.startsWith("::")) {
      return false
    }
    if (address.endsWith(":") && !address.endsWith("::")) {
      return false
    }

    return true
  }

  return false
}

export const securityGroupRuleSchema = z.object({
  id: z.string(),
  direction: z.enum(["ingress", "egress"]).optional(),
  ethertype: z.enum(["IPv4", "IPv6"]).optional(),
  description: z.string().nullable().optional(),
  security_group_id: z.string().optional(),
  protocol: z.string().nullable().optional(),
  port_range_min: z.number().nullable().optional(),
  port_range_max: z.number().nullable().optional(),
  remote_ip_prefix: z.string().nullable().optional(),
  remote_group_id: z.string().nullable().optional(),
  remote_address_group_id: z.string().nullable().optional(),
  tenant_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  revision_number: z.number().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
})

export const securityGroupSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tenant_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  stateful: z.boolean().optional(),
  shared: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  security_group_rules: z.array(securityGroupRuleSchema).optional(),
  revision_number: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
})

export const securityGroupsResponseSchema = z.object({
  security_groups: z.array(securityGroupSchema),
})

export const securityGroupResponseSchema = z.object({
  security_group: securityGroupSchema,
})

export const securityGroupRuleResponseSchema = z.object({
  security_group_rule: securityGroupRuleSchema,
})

export const listSecurityGroupsInputSchema = z.object({
  // Pagination
  limit: z.number().int().min(1).max(1000).optional(),
  marker: z.string().optional(),
  page_reverse: z.boolean().optional(),

  // Sorting
  sort_key: z.string().optional(),
  sort_dir: SortDirSchema.optional(),

  // Basic filtering
  name: z.string().optional(),
  description: z.string().optional(),
  project_id: z.string().optional(),
  tenant_id: z.string().optional(),
  shared: z.boolean().optional(),

  // Tag-based filtering (string values follow Neutron semantics)
  tags: z.string().optional(),
  tags_any: z.string().optional(),
  not_tags: z.string().optional(),
  not_tags_any: z.string().optional(),

  // BFF-side search (filtered in BFF layer, not sent to OpenStack)
  searchTerm: z.string().optional(),
})

export const getSecurityGroupByIdInputSchema = z.object({
  securityGroupId: z.string(),
})

export const createSecurityGroupInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  stateful: z.boolean().optional(),
})

export const deleteSecurityGroupInputSchema = z.object({
  securityGroupId: z.string(),
})

export const updateSecurityGroupInputSchema = z.object({
  securityGroupId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  stateful: z.boolean().optional(),
})

export const deleteSecurityGroupRuleInputSchema = z.object({
  ruleId: z.string(),
})

export const createSecurityGroupRuleInputSchema = z
  .object({
    security_group_id: z.string(),
    direction: z.enum(["ingress", "egress"]),
    ethertype: z.enum(["IPv4", "IPv6"]).default("IPv4"),
    description: z.string().optional(),
    protocol: z.string().nullable().optional(),
    port_range_min: z.number().int().min(0).max(65535).nullable().optional(),
    port_range_max: z.number().int().min(0).max(65535).nullable().optional(),
    // Transform empty strings to undefined for proper validation
    remote_ip_prefix: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    remote_group_id: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    remote_address_group_id: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  // Validate mutual exclusivity of remote fields
  .refine(
    (data) => {
      const remoteFields = [data.remote_ip_prefix, data.remote_group_id, data.remote_address_group_id].filter(
        (field) => field != null && field !== ""
      )
      return remoteFields.length <= 1
    },
    {
      message: "Only one of remote_ip_prefix, remote_group_id, or remote_address_group_id can be set",
    }
  )
  // Validate port range order
  .refine(
    (data) => {
      if (data.port_range_min != null && data.port_range_max != null) {
        return data.port_range_min <= data.port_range_max
      }
      return true
    },
    {
      message: "port_range_min must be less than or equal to port_range_max",
    }
  )
  // Validate CIDR format if remote_ip_prefix is provided
  .refine(
    (data) => {
      if (data.remote_ip_prefix != null && data.remote_ip_prefix !== "") {
        return isValidCIDR(data.remote_ip_prefix)
      }
      return true
    },
    {
      message: "remote_ip_prefix must be a valid CIDR notation (e.g., 0.0.0.0/0 or ::/0)",
    }
  )

export type SecurityGroupRule = z.infer<typeof securityGroupRuleSchema>
export type SecurityGroup = z.infer<typeof securityGroupSchema>
export type SecurityGroupsResponse = z.infer<typeof securityGroupsResponseSchema>
export type SecurityGroupResponse = z.infer<typeof securityGroupResponseSchema>
export type SecurityGroupRuleResponse = z.infer<typeof securityGroupRuleResponseSchema>
export type ListSecurityGroupsInput = z.infer<typeof listSecurityGroupsInputSchema>
export type GetSecurityGroupByIdInput = z.infer<typeof getSecurityGroupByIdInputSchema>
export type CreateSecurityGroupInput = z.infer<typeof createSecurityGroupInputSchema>
export type DeleteSecurityGroupInput = z.infer<typeof deleteSecurityGroupInputSchema>
export type UpdateSecurityGroupInput = z.infer<typeof updateSecurityGroupInputSchema>
export type DeleteSecurityGroupRuleInput = z.infer<typeof deleteSecurityGroupRuleInputSchema>
export type CreateSecurityGroupRuleInput = z.infer<typeof createSecurityGroupRuleInputSchema>

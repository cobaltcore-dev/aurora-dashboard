import { z } from "zod"

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

const sortDirSchema = z.enum(["asc", "desc"])

export const listSecurityGroupsInputSchema = z.object({
  // Pagination
  limit: z.number().int().min(1).max(1000).optional(),
  marker: z.string().optional(),
  page_reverse: z.boolean().optional(),

  // Sorting
  sort_key: z.string().optional(),
  sort_dir: sortDirSchema.optional(),

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

export type SecurityGroupRule = z.infer<typeof securityGroupRuleSchema>
export type SecurityGroup = z.infer<typeof securityGroupSchema>
export type SecurityGroupsResponse = z.infer<typeof securityGroupsResponseSchema>
export type ListSecurityGroupsInput = z.infer<typeof listSecurityGroupsInputSchema>

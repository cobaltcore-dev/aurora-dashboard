import { z } from "zod"
import { SortDirSchema } from "./index"
import { projectScopedInputSchema } from "../../trpc"

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

export const listSecurityGroupsInputSchema = projectScopedInputSchema.extend({
  // Sorting
  sort_key: z.string().optional(),
  sort_dir: SortDirSchema.optional(),

  // Basic filtering
  name: z.string().optional(),
  description: z.string().optional(),
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

export const getSecurityGroupByIdInputSchema = projectScopedInputSchema.extend({
  securityGroupId: z.string(),
})

export const createSecurityGroupInputSchema = projectScopedInputSchema.extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  stateful: z.boolean().optional(),
})

export const deleteSecurityGroupInputSchema = projectScopedInputSchema.extend({
  securityGroupId: z.string(),
})

export const updateSecurityGroupInputSchema = projectScopedInputSchema.extend({
  securityGroupId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  stateful: z.boolean().optional(),
})

export const deleteSecurityGroupRuleInputSchema = projectScopedInputSchema.extend({
  ruleId: z.string(),
})

export const createSecurityGroupRuleInputSchema = projectScopedInputSchema.extend({
  security_group_id: z.string(),
  direction: z.enum(["ingress", "egress"]),
  ethertype: z.enum(["IPv4", "IPv6"]).default("IPv4"),
  description: z.string().optional(),
  protocol: z.string().nullable().optional(),
  port_range_min: z.number().int().max(65535).nullable().optional(),
  port_range_max: z.number().int().max(65535).nullable().optional(),
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

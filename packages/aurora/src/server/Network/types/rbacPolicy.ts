import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"

// OpenStack RBAC Policy Response Schema
export const rbacPolicySchema = z.object({
  id: z.string(),
  object_type: z.enum(["qos_policy", "network", "security_group"]),
  object_id: z.string(),
  action: z.enum(["access_as_shared", "access_as_external"]),
  target_tenant: z.string(),
  tenant_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
})

export const rbacPoliciesResponseSchema = z.object({
  rbac_policies: z.array(rbacPolicySchema),
})

export const rbacPolicyResponseSchema = z.object({
  rbac_policy: rbacPolicySchema,
})

// Input schemas for tRPC procedures - now extend projectScopedInputSchema
export const listRBACPoliciesForSecurityGroupInputSchema = projectScopedInputSchema.extend({
  securityGroupId: z.string(),
})

export const createRBACPolicyInputSchema = projectScopedInputSchema.extend({
  securityGroupId: z.string(),
  targetTenant: z.string().trim().min(1, "Target project ID is required"),
})

export const updateRBACPolicyInputSchema = projectScopedInputSchema.extend({
  policyId: z.string(),
  targetTenant: z.string().trim().min(1, "Target project ID is required"),
})

export const deleteRBACPolicyInputSchema = projectScopedInputSchema.extend({
  policyId: z.string(),
})

// TypeScript types inferred from Zod schemas
export type RBACPolicy = z.infer<typeof rbacPolicySchema>
export type RBACPoliciesResponse = z.infer<typeof rbacPoliciesResponseSchema>
export type RBACPolicyResponse = z.infer<typeof rbacPolicyResponseSchema>
export type ListRBACPoliciesForSecurityGroupInput = z.infer<typeof listRBACPoliciesForSecurityGroupInputSchema>
export type CreateRBACPolicyInput = z.infer<typeof createRBACPolicyInputSchema>
export type UpdateRBACPolicyInput = z.infer<typeof updateRBACPolicyInputSchema>
export type DeleteRBACPolicyInput = z.infer<typeof deleteRBACPolicyInputSchema>

import { protectedProcedure } from "../../trpc"
import {
  listRBACPoliciesForSecurityGroupInputSchema,
  createRBACPolicyInputSchema,
  updateRBACPolicyInputSchema,
  deleteRBACPolicyInputSchema,
  type RBACPolicy,
} from "../types/rbacPolicy"
import { withErrorHandling } from "../../helpers/errorHandling"
import {
  RBACPolicyErrorHandlers,
  parseRBACPolicyResponse,
  parseRBACPoliciesListResponse,
} from "../helpers/rbacPolicyHelpers"
import { getNetworkService } from "../helpers/index"

const RBAC_POLICIES_BASE_URL = "v2.0/rbac-policies"

/**
 * tRPC router for OpenStack Neutron RBAC Policies.
 *
 * Exposes:
 * - list: GET /v2.0/rbac-policies filtered by object_type and object_id
 * - create: POST /v2.0/rbac-policies to share a security group
 * - update: PUT /v2.0/rbac-policies/{rbac_policy_id} to change target tenant
 * - delete: DELETE /v2.0/rbac-policies/{rbac_policy_id} to revoke sharing
 */
export const rbacPolicyRouter = {
  list: protectedProcedure
    .input(listRBACPoliciesForSecurityGroupInputSchema)
    .query(async ({ input, ctx }): Promise<RBACPolicy[]> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        const network = getNetworkService(ctx)

        // Query parameters to filter by security group
        const queryParams = new URLSearchParams({
          object_type: "security_group",
          object_id: securityGroupId,
        })

        const url = `${RBAC_POLICIES_BASE_URL}?${queryParams.toString()}`
        const response = await network.get(url)

        if (!response.ok) {
          throw RBACPolicyErrorHandlers.list(response)
        }

        const data = await response.json()
        return parseRBACPoliciesListResponse(data, "rbacPolicyRouter.listForSecurityGroup")
      }, "list RBAC policies for security group")
    }),

  create: protectedProcedure
    .input(createRBACPolicyInputSchema)
    .mutation(async ({ input, ctx }): Promise<RBACPolicy> => {
      return withErrorHandling(async () => {
        const { securityGroupId, targetTenant } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          rbac_policy: {
            object_type: "security_group",
            object_id: securityGroupId,
            action: "access_as_shared",
            target_tenant: targetTenant,
          },
        }

        const response = await network.post(RBAC_POLICIES_BASE_URL, requestBody)

        if (!response.ok) {
          throw RBACPolicyErrorHandlers.create(response)
        }

        const data = await response.json()
        return parseRBACPolicyResponse(data, "rbacPolicyRouter.create")
      }, "create RBAC policy")
    }),

  update: protectedProcedure
    .input(updateRBACPolicyInputSchema)
    .mutation(async ({ input, ctx }): Promise<RBACPolicy> => {
      return withErrorHandling(async () => {
        const { policyId, targetTenant } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          rbac_policy: {
            target_tenant: targetTenant,
          },
        }

        const response = await network.put(`${RBAC_POLICIES_BASE_URL}/${policyId}`, requestBody)

        if (!response.ok) {
          throw RBACPolicyErrorHandlers.update(response, policyId)
        }

        const data = await response.json()
        return parseRBACPolicyResponse(data, "rbacPolicyRouter.update")
      }, "update RBAC policy")
    }),

  delete: protectedProcedure.input(deleteRBACPolicyInputSchema).mutation(async ({ input, ctx }): Promise<void> => {
    return withErrorHandling(async () => {
      const { policyId } = input
      const network = getNetworkService(ctx)

      const response = await network.del(`${RBAC_POLICIES_BASE_URL}/${policyId}`)

      if (!response?.ok) {
        throw RBACPolicyErrorHandlers.delete(response, policyId)
      }
    }, "delete RBAC policy")
  }),
}

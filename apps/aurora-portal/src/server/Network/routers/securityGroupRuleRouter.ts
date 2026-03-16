import { protectedProcedure } from "../../trpc"
import {
  deleteSecurityGroupRuleInputSchema,
  createSecurityGroupRuleInputSchema,
  type SecurityGroupRule,
} from "../types/securityGroup"
import { withErrorHandling } from "../../helpers/errorHandling"
import { SecurityGroupRuleErrorHandlers, parseSecurityGroupRuleResponse } from "../helpers/securityGroupHelpers"
import { getNetworkService } from "../helpers/index"

const SECURITY_GROUP_RULES_BASE_URL = "v2.0/security-group-rules"

/**
 * tRPC router for OpenStack Neutron Security Group Rules.
 *
 * Currently exposes:
 * - delete: DELETE /v2.0/security-group-rules/{security_group_rule_id} to delete a rule.
 * - create: POST /v2.0/security-group-rules to create a new rule.
 */
export const securityGroupRuleRouter = {
  delete: protectedProcedure
    .input(deleteSecurityGroupRuleInputSchema)
    .mutation(async ({ input, ctx }): Promise<void> => {
      return withErrorHandling(async () => {
        const { ruleId } = input
        const network = getNetworkService(ctx)

        const response = await network.del(`${SECURITY_GROUP_RULES_BASE_URL}/${ruleId}`)

        if (!response?.ok) {
          throw SecurityGroupRuleErrorHandlers.delete(response, ruleId)
        }
      }, "delete security group rule")
    }),

  create: protectedProcedure
    .input(createSecurityGroupRuleInputSchema)
    .mutation(async ({ input, ctx }): Promise<SecurityGroupRule> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        // Build request body (wrap in "security_group_rule" key per OpenStack API)
        const requestBody = {
          security_group_rule: {
            security_group_id: input.security_group_id,
            direction: input.direction,
            ethertype: input.ethertype,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.protocol !== undefined && { protocol: input.protocol }),
            ...(input.port_range_min !== undefined && { port_range_min: input.port_range_min }),
            ...(input.port_range_max !== undefined && { port_range_max: input.port_range_max }),
            ...(input.remote_ip_prefix !== undefined && { remote_ip_prefix: input.remote_ip_prefix }),
            ...(input.remote_group_id !== undefined && { remote_group_id: input.remote_group_id }),
            ...(input.remote_address_group_id !== undefined && {
              remote_address_group_id: input.remote_address_group_id,
            }),
          },
        }

        const response = await network.post(SECURITY_GROUP_RULES_BASE_URL, requestBody)

        if (!response?.ok) {
          throw SecurityGroupRuleErrorHandlers.create(response)
        }

        const data = await response.json()
        return parseSecurityGroupRuleResponse(data, "securityGroupRuleRouter.create")
      }, "create security group rule")
    }),
}

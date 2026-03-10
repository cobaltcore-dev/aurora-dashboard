import { protectedProcedure } from "../../trpc"
import { deleteSecurityGroupRuleInputSchema } from "../types/securityGroup"
import { withErrorHandling } from "../../helpers/errorHandling"
import { getNetworkService } from "../helpers/networkHelpers"
import { SecurityGroupRuleErrorHandlers } from "../helpers/securityGroupHelpers"

const SECURITY_GROUP_RULES_BASE_URL = "v2.0/security-group-rules"

/**
 * tRPC router for OpenStack Neutron Security Group Rules.
 *
 * Currently exposes:
 * - delete: DELETE /v2.0/security-group-rules/{security_group_rule_id} to delete a rule.
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
}
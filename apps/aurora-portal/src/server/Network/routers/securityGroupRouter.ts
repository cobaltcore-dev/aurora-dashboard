import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "../../trpc"
import { appendQueryParamsFromObject } from "../../helpers/queryParams"
import { listSecurityGroupsInputSchema, securityGroupsResponseSchema, SecurityGroup } from "../types/securityGroup"
import { withErrorHandling } from "../../helpers/errorHandling"

const LIST_SECURITY_GROUPS_QUERY_KEY_MAP: Record<string, string> = {
  tags_any: "tags-any",
  not_tags: "not-tags",
  not_tags_any: "not-tags-any",
}

/**
 * tRPC router for OpenStack Neutron Security Groups.
 *
 * Currently exposes:
 * - list: GET /v2.0/security-groups with pagination, sorting and basic filtering support.
 */
export const securityGroupRouter = {
  list: protectedProcedure
    .input(listSecurityGroupsInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup[]> => {
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")

      if (!network) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Network service is not available",
        })
      }

      return withErrorHandling(async () => {
        const queryParams = appendQueryParamsFromObject(input as Record<string, unknown>, {
          keyMap: LIST_SECURITY_GROUPS_QUERY_KEY_MAP,
        })

        const queryString = queryParams.toString()
        const url = queryString ? `v2.0/security-groups?${queryString}` : "v2.0/security-groups"

        const response = await network.get(url)
        const data = await response.json()

        const parsed = securityGroupsResponseSchema.safeParse(data)

        if (!parsed.success) {
          console.error("Zod Parsing Error in securityGroupRouter.list:", parsed.error.format())
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse security groups response from OpenStack",
          })
        }

        return parsed.data.security_groups
      }, "list security groups")
    }),
}

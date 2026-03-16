import { protectedProcedure } from "../../trpc"
import {
  listSecurityGroupsInputSchema,
  SecurityGroup,
  getSecurityGroupByIdInputSchema,
  createSecurityGroupInputSchema,
  deleteSecurityGroupInputSchema,
  updateSecurityGroupInputSchema,
} from "../types/securityGroup"
import { withErrorHandling } from "../../helpers/errorHandling"
import { filterBySearchParams } from "../../helpers/filterBySearchParams"
import { SecurityGroupErrorHandlers } from "../helpers/securityGroupHelpers"
import { parseSecurityGroupResponse, parseSecurityGroupListResponse } from "../helpers/securityGroupHelpers"
import { getNetworkService } from "../helpers/index"
import { buildProjectScopedQueryParams } from "../../helpers/projectFilterHelpers"

const SECURITY_GROUPS_BASE_URL = "v2.0/security-groups"

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
 * - getById: GET /v2.0/security-groups/{security_group_id} to fetch a single security group with rules.
 *   Includes BFF-side search filtering by name, description, or id.
 * - create: POST /v2.0/security-groups to create a new security group.
 * - update: PUT /v2.0/security-groups/{security_group_id} to update a security group.
 * - deleteById: DELETE /v2.0/security-groups/{security_group_id} to delete a security group.
 */
export const securityGroupRouter = {
  list: protectedProcedure
    .input(listSecurityGroupsInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        // Build query params with server-enforced project filtering
        const queryParams = buildProjectScopedQueryParams(ctx, input, {
          keyMap: LIST_SECURITY_GROUPS_QUERY_KEY_MAP,
        })

        const queryString = queryParams.toString()
        const url = queryString ? `${SECURITY_GROUPS_BASE_URL}?${queryString}` : SECURITY_GROUPS_BASE_URL

        const response = await network.get(url)

        // Check for error responses before parsing
        if (!response.ok) {
          throw SecurityGroupErrorHandlers.list(response)
        }

        const data = await response.json()
        const securityGroups = parseSecurityGroupListResponse(data, "securityGroupRouter.list")

        // Apply BFF-side search filtering
        const { searchTerm } = input
        return filterBySearchParams(securityGroups, searchTerm, ["name", "description", "id"])
      }, "list security groups")
    }),

  getById: protectedProcedure
    .input(getSecurityGroupByIdInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        const network = getNetworkService(ctx)

        const response = await network.get(`${SECURITY_GROUPS_BASE_URL}/${securityGroupId}`)

        // Check for error responses before parsing
        if (!response.ok) {
          throw SecurityGroupErrorHandlers.getById(response, securityGroupId)
        }

        const data = await response.json()
        const securityGroup = parseSecurityGroupResponse(data, "securityGroupRouter.getById")

        return securityGroup
      }, "fetch security group by ID")
    }),

  create: protectedProcedure
    .input(createSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const requestBody = {
          security_group: {
            name: input.name,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.stateful !== undefined && { stateful: input.stateful }),
          },
        }

        const response = await network.post(SECURITY_GROUPS_BASE_URL, requestBody)

        // Check for error responses before parsing
        if (!response.ok) {
          throw SecurityGroupErrorHandlers.create(response)
        }

        const data = await response.json()
        return parseSecurityGroupResponse(data, "securityGroupRouter.create")
      }, "create security group")
    }),

  deleteById: protectedProcedure
    .input(deleteSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<void> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        const network = getNetworkService(ctx)

        const response = await network.del(`${SECURITY_GROUPS_BASE_URL}/${securityGroupId}`)

        if (!response?.ok) {
          throw SecurityGroupErrorHandlers.delete(response, securityGroupId)
        }
      }, "delete security group")
    }),
  update: protectedProcedure
    .input(updateSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const { securityGroupId, ...updateFields } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          security_group: {
            ...(updateFields.name !== undefined && { name: updateFields.name }),
            ...(updateFields.description !== undefined && { description: updateFields.description }),
            ...(updateFields.stateful !== undefined && { stateful: updateFields.stateful }),
          },
        }

        const response = await network.put(`${SECURITY_GROUPS_BASE_URL}/${securityGroupId}`, requestBody)

        if (!response.ok) {
          throw SecurityGroupErrorHandlers.update(response, securityGroupId)
        }

        const data = await response.json()
        return parseSecurityGroupResponse(data, "securityGroupRouter.update")
      }, "update security group")
    }),
}

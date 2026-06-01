import { projectScopedProcedure } from "../../trpc"
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
import {
  SecurityGroupErrorHandlers,
  parseSecurityGroupResponse,
  parseSecurityGroupListResponse,
  deduplicateSecurityGroupsById,
  sortSecurityGroups,
} from "../helpers/securityGroupHelpers"
import { getNetworkService } from "../helpers/index"
import { appendQueryParamsFromObject } from "../../helpers/queryParams"
import type { SignalOpenstackServiceType } from "@cobaltcore-dev/signal-openstack"

const SECURITY_GROUPS_BASE_URL = "v2.0/security-groups"

const LIST_SECURITY_GROUPS_QUERY_KEY_MAP: Record<string, string> = {
  tags_any: "tags-any",
  not_tags: "not-tags",
  not_tags_any: "not-tags-any",
}

/**
 * Helper function to fetch security groups with given parameters
 */
async function fetchSecurityGroupsWithParams(
  network: SignalOpenstackServiceType,
  params: Record<string, string | number | boolean | undefined>
): Promise<SecurityGroup[]> {
  const queryParams = appendQueryParamsFromObject(params, {
    keyMap: LIST_SECURITY_GROUPS_QUERY_KEY_MAP,
  })

  const queryString = queryParams.toString()
  const url = queryString ? `${SECURITY_GROUPS_BASE_URL}?${queryString}` : SECURITY_GROUPS_BASE_URL

  const response = await network.get(url)

  if (!response.ok) {
    throw SecurityGroupErrorHandlers.list(response)
  }

  const data = await response.json()
  return parseSecurityGroupListResponse(data, "fetchSecurityGroupsWithParams")
}

/**
 * tRPC router for OpenStack Neutron Security Groups.
 *
 * Currently exposes:
 * - list: GET /v2.0/security-groups - Fetches both own and shared security groups by default.
 *   User can explicitly filter by shared=true/false. Now uses projectScopedProcedure for automatic token rescoping.
 * - getById: GET /v2.0/security-groups/{security_group_id} to fetch a single security group with rules.
 *   Includes BFF-side search filtering by name, description, or id.
 * - create: POST /v2.0/security-groups to create a new security group.
 * - update: PUT /v2.0/security-groups/{security_group_id} to update a security group.
 * - deleteById: DELETE /v2.0/security-groups/{security_group_id} to delete a security group.
 */
export const securityGroupRouter = {
  list: projectScopedProcedure
    .input(listSecurityGroupsInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, project_id, shared, sort_key, sort_dir, ...queryInput } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        // If user explicitly filters by shared, use single request with all params
        if (shared !== undefined) {
          const securityGroups = await fetchSecurityGroupsWithParams(network, {
            ...queryInput,
            shared,
            sort_key,
            sort_dir,
          })
          return filterBySearchParams(securityGroups, searchTerm, ["name", "description", "id"])
        }

        // When fetching both own and shared groups, we need to:
        // 1. Fetch ALL items from both sources
        // 2. Merge and deduplicate
        // 3. Apply global sort in-memory
        const [ownGroups, sharedGroups] = await Promise.all([
          fetchSecurityGroupsWithParams(network, {
            ...queryInput,
            project_id,
            shared: false,
          }),
          fetchSecurityGroupsWithParams(network, {
            ...queryInput,
            shared: true,
          }),
        ])

        // Merge and deduplicate
        let combined = deduplicateSecurityGroupsById<SecurityGroup>([...ownGroups, ...sharedGroups])

        // Apply BFF-side search filter
        combined = filterBySearchParams<SecurityGroup>(combined, searchTerm, ["name", "description", "id"])

        // Apply global sort
        combined = sortSecurityGroups<SecurityGroup>(combined, sort_key, sort_dir)

        return combined
      }, "list security groups")
    }),

  getById: projectScopedProcedure
    .input(getSecurityGroupByIdInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
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

  create: projectScopedProcedure
    .input(createSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
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

  deleteById: projectScopedProcedure
    .input(deleteSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<void> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        const response = await network.del(`${SECURITY_GROUPS_BASE_URL}/${securityGroupId}`)

        if (!response?.ok) {
          throw SecurityGroupErrorHandlers.delete(response, securityGroupId)
        }
      }, "delete security group")
    }),
  update: projectScopedProcedure
    .input(updateSecurityGroupInputSchema)
    .mutation(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const { securityGroupId, ...updateFields } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
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

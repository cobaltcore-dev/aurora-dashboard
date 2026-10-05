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
  filterSecurityGroupsByStateful,
  sortSecurityGroups,
} from "../helpers/securityGroupHelpers"
import { getNetworkService } from "../helpers/index"
import { appendQueryParamsFromObject } from "../../helpers/queryParams"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
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
 * - list: GET /v2.0/security-groups - Every view is built from own (project-scoped, shared=false) and
 *   shared (shared=true) groups. Both are fetched by default; an explicit shared=true/false picks one side.
 *   Deduplication, stateful/search filtering and sorting happen in the BFF. Uses projectScopedProcedure
 *   for automatic token rescoping.
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
        const { searchTerm, project_id, shared, stateful, sort_key, sort_dir, ...queryInput } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        // "All" = own ∪ shared. An explicit `shared` filter selects one side, so every filtered view is a
        // subset of "All". project_id must stay on the own-side request: for admin tokens Neutron does not
        // scope to the token's project and would return every project's non-shared groups (#1321).
        const fetchOwn = () => fetchSecurityGroupsWithParams(network, { ...queryInput, project_id, shared: false })
        const fetchShared = () => fetchSecurityGroupsWithParams(network, { ...queryInput, shared: true })

        const requests = shared === undefined ? [fetchOwn(), fetchShared()] : [shared ? fetchShared() : fetchOwn()]
        const fetched = (await Promise.all(requests)).flat()

        // Filtering and sorting happen in the BFF, identically for every view
        let result = deduplicateSecurityGroupsById<SecurityGroup>(fetched)
        result = filterSecurityGroupsByStateful<SecurityGroup>(result, stateful)
        result = filterBySearchParams<SecurityGroup>(result, searchTerm, ["name", "description", "id"])

        return sortSecurityGroups<SecurityGroup>(result, sort_key, sort_dir)
      }, "list security groups")
    }),

  getById: projectScopedProcedure
    .input(getSecurityGroupByIdInputSchema)
    .query(async ({ input, ctx }): Promise<SecurityGroup> => {
      return withErrorHandling(async () => {
        const { securityGroupId } = input
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        const encodedId = validateAndEncodeResourceId(securityGroupId, "Security group")
        const response = await network.get(`${SECURITY_GROUPS_BASE_URL}/${encodedId}`)

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

        const encodedId = validateAndEncodeResourceId(securityGroupId, "Security group")
        const response = await network.del(`${SECURITY_GROUPS_BASE_URL}/${encodedId}`)

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

        const encodedId = validateAndEncodeResourceId(securityGroupId, "Security group")
        const response = await network.put(`${SECURITY_GROUPS_BASE_URL}/${encodedId}`, requestBody)

        if (!response.ok) {
          throw SecurityGroupErrorHandlers.update(response, securityGroupId)
        }

        const data = await response.json()
        return parseSecurityGroupResponse(data, "securityGroupRouter.update")
      }, "update security group")
    }),
}

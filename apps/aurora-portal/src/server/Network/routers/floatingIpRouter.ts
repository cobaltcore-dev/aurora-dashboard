import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import {
  FloatingIpQueryParametersSchema,
  FloatingIp,
  FloatingIpListResponseSchema,
  FloatingIpResponseSchema,
  FloatingIpIdInputSchema,
  FloatingIpUpdateRequestSchema,
  FloatingIpCreateRequestSchema,
} from "../types/floatingIp"
import { FloatingIpErrorHandlers } from "../helpers/floatingIpHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"

const FLOATING_IPS_BASE_URL = "v2.0/floatingips"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips List floating IPs with pagination, sorting and filtering support.
 *   Includes BFF-side search filtering by specific fields.
 * - create: POST /v2.0/floatingips Create floating IP.
 * - getById: GET /v2.0/floatingips/{floatingip_id} Show floating IP details.
 * - update: PUT /v2.0/floatingips/{floatingip_id} Update floating IP.
 * - delete: DELETE /v2.0/floatingips/{floatingip_id} Delete floating IP.
 */
export const floatingIpRouter = {
  list: projectScopedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, ...queryInput } = input
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject(queryInput)

        const queryString = queryParams.toString()
        const url = queryString ? `${FLOATING_IPS_BASE_URL}?${queryString}` : FLOATING_IPS_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.list(response)
        }

        const data = await response.json()
        const { floatingips } = parseOrThrow(FloatingIpListResponseSchema, data, "floatingIpRouter.list")

        return filterBySearchParams(floatingips, searchTerm, ["description"])
      }, "list floating IPs")
    }),
  create: projectScopedProcedure
    .input(FloatingIpCreateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<FloatingIp> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const requestBody = {
          floatingip: {
            tenant_id: input.tenant_id,
            project_id: input.project_id,
            floating_network_id: input.floating_network_id,
            ...(input.fixed_ip_address !== undefined && { fixed_ip_address: input.fixed_ip_address }),
            ...(input.floating_ip_address !== undefined && { floating_ip_address: input.floating_ip_address }),
            ...(input.port_id !== undefined && { port_id: input.port_id }),
            ...(input.subnet_id !== undefined && { subnet_id: input.subnet_id }),
            ...(input.distributed !== undefined && { distributed: input.distributed }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.dns_domain !== undefined && { dns_domain: input.dns_domain }),
            ...(input.dns_name !== undefined && { dns_name: input.dns_name }),
            ...(input.qos_policy_id !== undefined && { qos_policy_id: input.qos_policy_id }),
          },
        }
        const response = await network.post(FLOATING_IPS_BASE_URL, requestBody)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.create(response)
        }

        const data = await response.json()
        return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.create").floatingip
      }, "create floating IP")
    }),
  getById: projectScopedProcedure.input(FloatingIpIdInputSchema).query(async ({ input, ctx }): Promise<FloatingIp> => {
    return withErrorHandling(async () => {
      const { floatingip_id } = input
      const network = getNetworkService(ctx)

      const response = await network.get(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`)
      if (!response.ok) {
        throw FloatingIpErrorHandlers.get(response, floatingip_id)
      }

      const data = await response.json()
      return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.getById").floatingip
    }, "show floating IP details")
  }),
  update: projectScopedProcedure
    .input(FloatingIpUpdateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<FloatingIp> => {
      return withErrorHandling(async () => {
        const { floatingip_id, ...updateFields } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          floatingip: {
            port_id: updateFields.port_id,
            ...(updateFields.fixed_ip_address !== undefined && { fixed_ip_address: updateFields.fixed_ip_address }),
            ...(updateFields.description !== undefined && { description: updateFields.description }),
            ...(updateFields.distributed !== undefined && { distributed: updateFields.distributed }),
          },
        }
        const response = await network.put(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`, requestBody)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.update(response, floatingip_id)
        }

        const data = await response.json()
        return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.update").floatingip
      }, "update floating IP")
    }),
  delete: projectScopedProcedure.input(FloatingIpIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { floatingip_id } = input
      const network = getNetworkService(ctx)

      // OpenStack DELETE returns 204 No Content on success
      const response = await network.del(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`)
      if (!response.ok) {
        throw FloatingIpErrorHandlers.delete(response, floatingip_id)
      }

      // Return true for all successful responses (2xx)
      return true
    }, "delete floating IP")
  }),
}

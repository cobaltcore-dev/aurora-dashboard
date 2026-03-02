import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import {
  FloatingIpQueryParametersSchema,
  FloatingIp,
  FloatingIpResponseSchema,
  FloatingIpIdInputSchema,
  FloatingIpDetailResponseSchema,
} from "../types/floatingIp"
import { FloatingIpErrorHandlers } from "../helpers/floatingIpHelpers"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips List floating IPs with pagination, sorting and filtering support.
 *   Includes BFF-side search filtering by specific fields.
 * - getById: GET /v2.0/floatingips/{floatingip_id} Show floating IP details.
 * - delete: DELETE /v2.0/floatingips/{floatingip_id} Delete floating IP.
 */
export const floatingIpRouter = {
  list: protectedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      return withErrorHandling(async () => {
        const openstackSession = ctx.openstack
        const network = openstackSession?.service("network")
        validateOpenstackService(network, "network")

        // Extract searchTerm from input before building query params
        const { searchTerm, ...openstackParams } = input
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `v2.0/floatingips?${queryString}` : "v2.0/floatingips"

        const response = await network.get(url)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.list(response)
        }

        const data = await response.json()
        const parsed = FloatingIpResponseSchema.safeParse(data)
        if (!parsed.success) {
          console.error("Zod Parsing Error in floatingIpRouter.list:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse floating IPs response from OpenStack",
          })
        }
        const floatingIps = parsed.data.floatingips

        return filterBySearchParams(floatingIps, searchTerm, ["description"])
      }, "list floating IPs")
    }),
  getById: protectedProcedure
    .input(FloatingIpIdInputSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp | null> => {
      return withErrorHandling(async () => {
        const { floatingip_id } = input
        const openstackSession = ctx.openstack
        const network = openstackSession?.service("network")
        validateOpenstackService(network, "network")

        const response = await network.get(`v2.0/floatingips/${floatingip_id}`)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.get(response, floatingip_id)
        }

        const data = await response.json()
        const parsed = FloatingIpDetailResponseSchema.safeParse(data)

        if (!parsed.success) {
          console.error("Zod Parsing Error in floatingIpRouter.getById:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse floating IP response from OpenStack",
          })
        }

        return parsed.data.floatingip
      }, "show floating IP details")
    }),
  delete: protectedProcedure.input(FloatingIpIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { floatingip_id } = input
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")
      validateOpenstackService(network, "network")

      // OpenStack DELETE returns 204 No Content on success
      const response = await network.del(`v2.0/floatingips/${floatingip_id}`)
      if (!response?.ok) {
        throw FloatingIpErrorHandlers.delete(response, floatingip_id)
      }

      // Return true for all successful responses (2xx)
      return true
    }, "delete floating IP")
  }),
}

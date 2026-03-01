import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import {
  FloatingIpQueryParametersSchema,
  FloatingIp,
  FloatingIpResponseSchema,
  GetFloatingIpByIdInputSchema,
  FloatingIpDetailResponseSchema,
} from "../types/floatingIp"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips List floating IPs with pagination, sorting and filtering support.
 *   Includes BFF-side search filtering by specific fields.
 * - getById: GET /v2.0/floatingips/{floatingip_id} Show floating IP details.
 */
export const floatingIpRouter = {
  list: protectedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      return withErrorHandling(async () => {
        const openstackSession = ctx.openstack
        const network = openstackSession?.service("network")

        if (!network) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
        }

        // Extract searchTerm from input before building query params
        const { searchTerm, ...openstackParams } = input
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `v2.0/floatingips?${queryString}` : "v2.0/floatingips"

        const response = await network.get(url)
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
    .input(GetFloatingIpByIdInputSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp | null> => {
      return withErrorHandling(async () => {
        const { floatingip_id } = input
        const openstackSession = ctx.openstack
        const network = openstackSession?.service("network")

        if (!network) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
        }

        const response = await network.get(`v2.0/floatingips/${floatingip_id}`)
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
}

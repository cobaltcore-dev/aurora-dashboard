import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { FloatingIpQueryParametersSchema, FloatingIp, FloatingIpResponseSchema } from "../types/floatingIp"
import { filterBySearchParams } from "../../helpers/filterBySearchParams"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips with pagination, sorting and filtering support.
 * - getById: GET /v2.0/floatingips/{floating_ip_id} to fetch a single floating IP.
 *   Includes BFF-side search filtering by specific fields.
 */
export const floatingIpRouter = {
  list: protectedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")

      if (!network) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
      }

      return withErrorHandling(async () => {
        // Extract searchTerm from input before building query params
        const { searchTerm, ...openstackParams } = input
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `v2.0/floatingips?${queryString}` : "v2.0/floatingips"

        const response = await network.get(url)
        const data = await response.json()
        const parsed = FloatingIpResponseSchema.safeParse(data)

        if (!parsed.success) {
          console.error("Zod Parsing Error in floatingIpRouter.listFloatingIPs:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse floating IPs response from OpenStack",
          })
        }
        const floatingIps = parsed.data.floatingips
        return filterBySearchParams(floatingIps, searchTerm, ["description"])
      }, "list floating ips")
    }),
  getById: protectedProcedure
    .input(FloatingIpQueryParametersSchema.pick({ id: true, searchTerm: true }))
    .query(async ({ input, ctx }): Promise<FloatingIp | null> => {
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")

      if (!network) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
      }

      return withErrorHandling(async () => {
        const { id, searchTerm } = input
        const url = `v2.0/floatingips/${id}`
        const response = await network.get(url)
        const data = await response.json()
        const parsed = FloatingIpResponseSchema.safeParse({ floatingips: [data.floatingip] })

        if (!parsed.success) {
          console.error("Zod Parsing Error in floatingIpRouter.getFloatingIPById:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse floating IP response from OpenStack",
          })
        }
        const floatingIp = parsed.data.floatingips[0]
        if (searchTerm) {
          return filterBySearchParams([floatingIp], searchTerm, ["description"])[0] || null
        }
        return floatingIp
      }, "get floating ip by id")
    }),
}

import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { FloatingIpQueryParametersSchema, FloatingIp, FloatingIpResponseSchema } from "../types/floatingIp"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips with pagination, sorting and filtering support.
 */
export const floatingIpRouter = {
  listFloatingIPs: protectedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      const openstackSession = ctx.openstack
      const network = openstackSession?.service("network")

      if (!network) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
      }

      return withErrorHandling(async () => {
        const queryParams = new URLSearchParams()
        appendQueryParamsFromObject(queryParams, input as Record<string, unknown>)

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
        return parsed.data.floatingips
      }, "list floating IPs")
    }),
}

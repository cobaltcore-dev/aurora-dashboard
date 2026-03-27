import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { ListAvailablePortsQuerySchema, AvailablePort, AvailablePortListResponseSchema } from "../types/port"
import { getNetworkService } from "../helpers/index"
import { PortErrorHandlers } from "../helpers/portHelpers"

export const PORT_BASE_URL = "v2.0/ports"

/**
 * tRPC router for OpenStack Neutron Ports.
 *
 * Currently exposes:
 * - listAvailablePorts: GET /v2.0/ports List available ports for creating floating IPs, ensuring users can only see valid, unassociated ports.
 */
export const portRouter = {
  listAvailablePorts: protectedProcedure
    .input(ListAvailablePortsQuerySchema)
    .query(async ({ input, ctx }): Promise<AvailablePort[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject({
          ...input,
          // Fetch only these fields, as the floating IP association only requires port_id with name and fixed_ips. This optimizes the response size and parsing.
          fields: ["id", "name", "fixed_ips"],
        })
        const queryString = queryParams.toString()
        const url = queryString ? `${PORT_BASE_URL}?${queryString}` : PORT_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw PortErrorHandlers.list(response)
        }

        const data = await response.json()
        const parsed = AvailablePortListResponseSchema.safeParse(data)
        if (!parsed.success) {
          console.error("Zod Parsing Error in portRouter.listAvailablePorts:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse ports response from OpenStack",
          })
        }

        return parsed.data.ports
      }, "list available ports")
    }),
}

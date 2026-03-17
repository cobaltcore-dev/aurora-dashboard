import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { ListAvailablePortsQuerySchema, Port, PortListResponseSchema } from "../types/port"
import { getNetworkService } from "../helpers/index"
import { PortErrorHandlers } from "../helpers/portHelpers"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"

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
    .query(async ({ input, ctx }): Promise<Port[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        // Build query params from input
        const queryParams = appendQueryParamsFromObject(input)

        const queryString = queryParams.toString()
        const url = queryString ? `${PORT_BASE_URL}?${queryString}` : PORT_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw PortErrorHandlers.list(response)
        }

        const data = await response.json()
        const parsed = PortListResponseSchema.safeParse(data)
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

import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { ListAvailablePortsQuerySchema, AvailablePort, AvailablePortListResponseSchema } from "../types/port"
import { getNetworkService, parseOrThrow } from "../helpers/index"
import { PortErrorHandlers } from "../helpers/portHelpers"

export const PORT_BASE_URL = "v2.0/ports"

/**
 * tRPC router for OpenStack Neutron Ports.
 *
 * Now uses projectScopedProcedure for automatic token rescoping.
 *
 * Currently exposes:
 * - listAvailablePorts: GET /v2.0/ports List available ports for creating floating IPs, ensuring users can only see valid, unassociated ports.
 */
export const portRouter = {
  listAvailablePorts: projectScopedProcedure
    .input(ListAvailablePortsQuerySchema)
    .query(async ({ input, ctx }): Promise<AvailablePort[]> => {
      return withErrorHandling(async () => {
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        // Extract project_id from input - it's used for rescoping, not for OpenStack API filtering
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { project_id, ...openstackFilters } = input
        const queryParams = appendQueryParamsFromObject({
          ...openstackFilters,
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
        return parseOrThrow(AvailablePortListResponseSchema, data, "portRouter.listAvailablePorts").ports
      }, "list available ports")
    }),
}

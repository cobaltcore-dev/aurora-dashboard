import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
import {
  NetworkQueryParametersSchema,
  NetworkIdInputSchema,
  NetworkListResponseSchema,
  NetworkResponseSchema,
  NetworkSubnetListResponseSchema,
  type NetworkListItem,
  type NetworkSubnet,
} from "../types/network"
import { requestOrThrow } from "../helpers/routerHelpers"
import { NetworkErrorHandlers, toNetworkListItem, filterNetworksByBffParams } from "../helpers/networkHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"

const NETWORKS_BASE_URL = "v2.0/networks"
const SUBNETS_BASE_URL = "v2.0/subnets"

const withQuery = (baseUrl: string, params: URLSearchParams): string => {
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * tRPC router for OpenStack Neutron Networks (L2) — read-only.
 *
 * - list: GET /v2.0/networks  List networks with Neutron-side sorting; BFF-side search and status filter.
 * - getById: GET /v2.0/networks/{network_id}  Show one network.
 * - listSubnets: GET /v2.0/subnets?network_id={network_id}  Subnets attached to a network (detail "Subnets" tab).
 */
export const networksRouter = {
  list: projectScopedProcedure
    .input(NetworkQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<NetworkListItem[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, status, ...openstackFilters } = input
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject(openstackFilters)
        const response = await requestOrThrow(
          () => network.get(withQuery(NETWORKS_BASE_URL, queryParams)),
          NetworkErrorHandlers.list
        )

        const data = await response.json()
        const { networks } = parseOrThrow(NetworkListResponseSchema, data, "networksRouter.list")

        const filtered = filterBySearchParams(filterNetworksByBffParams(networks, { status }), searchTerm, [
          "id",
          "name",
          "description",
        ])

        return filtered.map(toNetworkListItem)
      }, "list networks")
    }),

  getById: projectScopedProcedure
    .input(NetworkIdInputSchema)
    .query(async ({ input, ctx }): Promise<NetworkListItem> => {
      return withErrorHandling(async () => {
        const { network_id } = input
        const service = getNetworkService(ctx)

        const encodedId = validateAndEncodeResourceId(network_id, "Network")
        const response = await requestOrThrow(
          () => service.get(`${NETWORKS_BASE_URL}/${encodedId}`),
          NetworkErrorHandlers.get,
          network_id
        )

        const data = await response.json()
        const { network } = parseOrThrow(NetworkResponseSchema, data, "networksRouter.getById")
        return toNetworkListItem(network)
      }, "show network details")
    }),

  listSubnets: projectScopedProcedure
    .input(NetworkIdInputSchema)
    .query(async ({ input, ctx }): Promise<NetworkSubnet[]> => {
      return withErrorHandling(async () => {
        const { network_id } = input
        const service = getNetworkService(ctx)

        // Validates the ID; it is sent as a query param (encoded by URLSearchParams), not as a path segment
        validateAndEncodeResourceId(network_id, "Network")

        const params = appendQueryParamsFromObject({
          network_id,
          fields: ["id", "name", "cidr", "ip_version", "gateway_ip", "enable_dhcp"],
        })
        const response = await requestOrThrow(
          () => service.get(withQuery(SUBNETS_BASE_URL, params)),
          NetworkErrorHandlers.listSubnets,
          network_id
        )

        const data = await response.json()
        return parseOrThrow(NetworkSubnetListResponseSchema, data, "networksRouter.listSubnets").subnets
      }, "list network subnets")
    }),
}

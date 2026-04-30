import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { omit } from "@/server/helpers/object"
import { getNetworkService, parseOrThrow } from "../helpers/index"
import { NetworkErrorHandlers } from "../helpers/networkHelpers"
import {
  ListDnsDomainsQuerySchema,
  ListExternalNetworksQuerySchema,
  Network,
  NetworkDnsDomainListResponseSchema,
  NetworkListResponseSchema,
} from "../types/network"

export const NETWORK_BASE_URL = "v2.0/networks"

/**
 * tRPC router for OpenStack Neutron Network.
 *
 * Now uses projectScopedProcedure for automatic token rescoping.
 *
 * Currently exposes:
 * - listExternalNetworks: GET /v2.0/networks?router:external=true
 * - listDnsDomains: GET /v2.0/networks?fields=dns_domain
 */
export const networkRouter = {
  listExternalNetworks: projectScopedProcedure
    .input(ListExternalNetworksQuerySchema)
    .query(async ({ input, ctx }): Promise<Network[]> => {
      return withErrorHandling(async () => {
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        // Extract project_id from input - it's used for rescoping, not for OpenStack API filtering
        const openstackFilters = omit(input, "project_id")
        const openstackParams = { ...openstackFilters, "router:external": true as const }
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `${NETWORK_BASE_URL}?${queryString}` : NETWORK_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw NetworkErrorHandlers.list(response)
        }

        const data = await response.json()
        return parseOrThrow(NetworkListResponseSchema, data, "networkRouter.listExternalNetworks").networks
      }, "list external networks")
    }),
  listDnsDomains: projectScopedProcedure
    .input(ListDnsDomainsQuerySchema)
    .query(async ({ input, ctx }): Promise<string[]> => {
      return withErrorHandling(async () => {
        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const network = getNetworkService(ctx)

        // Extract project_id from input - it's used for rescoping, not for OpenStack API filtering
        const openstackFilters = omit(input, "project_id")
        const openstackParams = { ...openstackFilters, fields: "dns_domain" }
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `${NETWORK_BASE_URL}?${queryString}` : NETWORK_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw NetworkErrorHandlers.list(response)
        }

        const data = await response.json()
        const { networks } = parseOrThrow(NetworkDnsDomainListResponseSchema, data, "networkRouter.listDnsDomains")

        // Normalize OpenStack network-level dns_domain values for consumers:
        // - drop missing/empty values
        // - deduplicate domains that may appear on multiple networks
        const dnsDomains = networks
          .map((networkItem) => networkItem.dns_domain)
          .filter((dnsDomain): dnsDomain is string => dnsDomain !== undefined && dnsDomain.length > 0)

        // Preserve insertion order while returning unique dns domains.
        return [...new Set(dnsDomains)]
      }, "list dns domains")
    }),
}

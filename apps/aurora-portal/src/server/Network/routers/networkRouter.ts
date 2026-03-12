import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { getNetworkService } from "../helpers/index"
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
 * Currently exposes:
 * - listExternalNetworks: GET /v2.0/networks?router:external=true
 * - listDnsDomains: GET /v2.0/networks?fields=dns_domain
 */
export const networkRouter = {
  listExternalNetworks: protectedProcedure
    .input(ListExternalNetworksQuerySchema)
    .query(async ({ input, ctx }): Promise<Network[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const openstackParams = { ...input, "router:external": true as const }
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `${NETWORK_BASE_URL}?${queryString}` : NETWORK_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw NetworkErrorHandlers.list(response)
        }

        const data = await response.json()
        const parsed = NetworkListResponseSchema.safeParse(data)
        if (!parsed.success) {
          console.error("Zod Parsing Error in networkRouter.listExternalNetworks:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse networks response from OpenStack",
          })
        }

        return parsed.data.networks
      }, "list external networks")
    }),
  listDnsDomains: protectedProcedure
    .input(ListDnsDomainsQuerySchema)
    .query(async ({ input, ctx }): Promise<string[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const openstackParams = { ...input, fields: "dns_domain" }
        const queryParams = appendQueryParamsFromObject(openstackParams)
        const queryString = queryParams.toString()
        const url = queryString ? `${NETWORK_BASE_URL}?${queryString}` : NETWORK_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw NetworkErrorHandlers.list(response)
        }

        const data = await response.json()
        const parsed = NetworkDnsDomainListResponseSchema.safeParse(data)
        if (!parsed.success) {
          console.error("Zod Parsing Error in networkRouter.listDnsDomains:", parsed.error.format())
          throw new TRPCError({
            code: "PARSE_ERROR",
            message: "Failed to parse dns domains response from OpenStack",
          })
        }

        // Normalize OpenStack network-level dns_domain values for consumers:
        // - drop missing/empty values
        // - deduplicate domains that may appear on multiple networks
        const dnsDomains = parsed.data.networks
          .map((networkItem) => networkItem.dns_domain)
          .filter((dnsDomain): dnsDomain is string => dnsDomain !== undefined && dnsDomain.length > 0)

        // Preserve insertion order while returning unique dns domains.
        return [...new Set(dnsDomains)]
      }, "list dns domains")
    }),
}

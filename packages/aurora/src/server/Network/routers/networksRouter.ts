import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { omit } from "@/server/helpers/object"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
import {
  Network,
  NetworkListItem,
  NetworkSubnet,
  NetworkQueryParametersSchema,
  NetworkIdInputSchema,
  NetworkCreateRequestSchema,
  NetworkUpdateRequestSchema,
  NetworkSetTagsRequestSchema,
  NetworkListResponseSchema,
  NetworkResponseSchema,
  NetworkTagsResponseSchema,
  NetworkSubnetListResponseSchema,
} from "../types/network"
import { Port, PortListResponseSchema } from "../types/port"
import {
  NetworkErrorHandlers,
  buildNetworkBody,
  getNetworkListScopes,
  mergeNetworks,
  applySubnetNames,
} from "../helpers/networkHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"
import { requestOrThrow, withQuery } from "../helpers/requestHelpers"

const NETWORKS_BASE_URL = "v2.0/networks"
const SUBNETS_BASE_URL = "v2.0/subnets"
const PORTS_BASE_URL = "v2.0/ports"

const networkUrl = (networkId: string, subresource?: "tags"): string => {
  const encodedId = validateAndEncodeResourceId(networkId, "Network")
  return subresource ? `${NETWORKS_BASE_URL}/${encodedId}/${subresource}` : `${NETWORKS_BASE_URL}/${encodedId}`
}

/**
 * tRPC router for OpenStack Neutron Networks (L2).
 *
 * Currently exposes:
 * - list: GET /v2.0/networks List the project's own networks (project_id) and the shared networks it can use
 *   (shared=true), merged by ID. Search, filter and sort are applied client-side (E5), so no extra calls.
 * - getById: GET /v2.0/networks/{network_id} Show network details.
 * - create: POST /v2.0/networks Create network.
 * - update: PUT /v2.0/networks/{network_id} Update name, description, admin state, MTU, port security, etc.
 * - delete: DELETE /v2.0/networks/{network_id} Delete network (Neutron also removes its subnets).
 * - setTags: PUT /v2.0/networks/{network_id}/tags Replace all tags of the network.
 *
 * - listSubnets: GET /v2.0/subnets?network_id={network_id} Subnets of the network for the details view.
 */
export const networksRouter = {
  list: projectScopedProcedure
    .input(NetworkQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<NetworkListItem[]> => {
      return withErrorHandling(async () => {
        const { project_id } = input
        const network = getNetworkService(ctx)

        // Neutron's project_id filter hides shared networks owned by other projects, which the project can
        // still use, so own networks (project_id) and shared networks (shared=true) are requested and merged.
        // Search, filter and sort run client-side over this response (E5), so no query/sort params are sent.
        const requests = getNetworkListScopes(undefined).map(async (scope) => {
          const scopeFilters = scope === "own" ? { project_id } : { shared: true }
          const queryParams = appendQueryParamsFromObject(scopeFilters)
          const response = await requestOrThrow(
            () => network.get(withQuery(NETWORKS_BASE_URL, queryParams)),
            NetworkErrorHandlers.list
          )
          const data = await response.json()
          return parseOrThrow(NetworkListResponseSchema, data, "networksRouter.list").networks
        })

        // Subnet count is derived client-side from each network's embedded `subnets` array; no subnets lookup.
        return applySubnetNames(mergeNetworks(...(await Promise.all(requests))))
      }, "list networks")
    }),

  getById: projectScopedProcedure.input(NetworkIdInputSchema).query(async ({ input, ctx }): Promise<Network> => {
    return withErrorHandling(async () => {
      const { network_id } = input
      const network = getNetworkService(ctx)

      const url = networkUrl(network_id)
      const response = await requestOrThrow(() => network.get(url), NetworkErrorHandlers.get, network_id)

      const data = await response.json()
      return parseOrThrow(NetworkResponseSchema, data, "networksRouter.getById").network
    }, "show network details")
  }),

  create: projectScopedProcedure
    .input(NetworkCreateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<Network> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)
        // project_id is intentionally not sent: Neutron derives ownership from the (rescoped) token
        const requestBody = { network: buildNetworkBody(omit(input, "project_id")) }

        const response = await requestOrThrow(
          () => network.post(NETWORKS_BASE_URL, requestBody),
          NetworkErrorHandlers.create
        )

        const data = await response.json()
        return parseOrThrow(NetworkResponseSchema, data, "networksRouter.create").network
      }, "create network")
    }),

  update: projectScopedProcedure
    .input(NetworkUpdateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<Network> => {
      return withErrorHandling(async () => {
        const { network_id, ...fields } = omit(input, "project_id")
        const network = getNetworkService(ctx)

        const updateFields = buildNetworkBody(fields)
        if (Object.keys(updateFields).length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
        }

        const url = networkUrl(network_id)
        const response = await requestOrThrow(
          () => network.put(url, { network: updateFields }),
          NetworkErrorHandlers.update,
          network_id
        )

        const data = await response.json()
        return parseOrThrow(NetworkResponseSchema, data, "networksRouter.update").network
      }, "update network")
    }),

  delete: projectScopedProcedure.input(NetworkIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { network_id } = input
      const network = getNetworkService(ctx)

      // OpenStack DELETE returns 204 No Content on success; 409 if ports of instances or routers still exist
      const url = networkUrl(network_id)
      await requestOrThrow(() => network.del(url), NetworkErrorHandlers.delete, network_id)

      return true
    }, "delete network")
  }),

  setTags: projectScopedProcedure
    .input(NetworkSetTagsRequestSchema)
    .mutation(async ({ input, ctx }): Promise<string[]> => {
      return withErrorHandling(async () => {
        const { network_id, tags } = input
        const network = getNetworkService(ctx)

        // Replaces the complete tag list; duplicates are dropped before sending
        const url = networkUrl(network_id, "tags")
        const response = await requestOrThrow(
          () => network.put(url, { tags: [...new Set(tags)] }),
          NetworkErrorHandlers.setTags,
          network_id
        )

        const data = await response.json()
        return parseOrThrow(NetworkTagsResponseSchema, data, "networksRouter.setTags").tags
      }, "set network tags")
    }),

  listSubnets: projectScopedProcedure
    .input(NetworkIdInputSchema)
    .query(async ({ input, ctx }): Promise<NetworkSubnet[]> => {
      return withErrorHandling(async () => {
        const { network_id } = input
        const network = getNetworkService(ctx)

        // Validates the ID; it is sent as a query param (encoded by URLSearchParams), not as a path segment
        validateAndEncodeResourceId(network_id, "Network")

        const params = appendQueryParamsFromObject({
          network_id,
          fields: [
            "id",
            "name",
            "cidr",
            "ip_version",
            "gateway_ip",
            "enable_dhcp",
            "allocation_pools",
            "dns_nameservers",
            "host_routes",
          ],
        })
        const response = await requestOrThrow(
          () => network.get(withQuery(SUBNETS_BASE_URL, params)),
          NetworkErrorHandlers.listSubnets,
          network_id
        )

        const data = await response.json()
        return parseOrThrow(NetworkSubnetListResponseSchema, data, "networksRouter.listSubnets").subnets
      }, "list network subnets")
    }),

  listPorts: projectScopedProcedure.input(NetworkIdInputSchema).query(async ({ input, ctx }): Promise<Port[]> => {
    return withErrorHandling(async () => {
      const { network_id } = input
      const network = getNetworkService(ctx)

      // Validates the ID; it is sent as a query param (encoded by URLSearchParams), not as a path segment
      validateAndEncodeResourceId(network_id, "Network")

      const params = appendQueryParamsFromObject({ network_id })
      const response = await requestOrThrow(
        () => network.get(withQuery(PORTS_BASE_URL, params)),
        NetworkErrorHandlers.listPorts,
        network_id
      )

      const data = await response.json()
      return parseOrThrow(PortListResponseSchema, data, "networksRouter.listPorts").ports
    }, "list network ports")
  }),
}

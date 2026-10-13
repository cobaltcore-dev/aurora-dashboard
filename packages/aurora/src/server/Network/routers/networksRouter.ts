import { z } from "zod"
import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
import {
  Network,
  NetworkListItem,
  NetworkDetails,
  SubnetDetail,
  NetworkQueryParametersSchema,
  NetworkIdInputSchema,
  NetworkCreateRequestSchema,
  NetworkUpdateRequestSchema,
  NetworkListResponseSchema,
  NetworkResponseSchema,
  SubnetListResponseSchema,
} from "../types/network"
import { NetworkErrorHandlers } from "../helpers/networkHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"

const NETWORKS_BASE_URL = "v2.0/networks"
const SUBNETS_BASE_URL = "v2.0/subnets"

const LIST_NETWORKS_QUERY_KEY_MAP: Record<string, string> = {
  tags_any: "tags-any",
  not_tags: "not-tags",
  not_tags_any: "not-tags-any",
  "router:external": "router:external",
}

const withQuery = (baseUrl: string, params: URLSearchParams): string => {
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

const networkUrl = (networkId: string): string => {
  const encodedId = validateAndEncodeResourceId(networkId, "Network")
  return `${NETWORKS_BASE_URL}/${encodedId}`
}

type NetworkService = ReturnType<typeof getNetworkService>

/**
 * Fetches subnet details for a list of subnet IDs.
 * Returns [] on failure so callers can handle missing subnet details gracefully.
 */
const fetchSubnetDetails = async (network: NetworkService, subnetIds: string[]): Promise<SubnetDetail[]> => {
  if (subnetIds.length === 0) return []
  try {
    const params = appendQueryParamsFromObject({ id: subnetIds })
    const response = await network.get(withQuery(SUBNETS_BASE_URL, params))
    if (!response.ok) return []
    const data = await response.json()
    return parseOrThrow(SubnetListResponseSchema, data, "networksRouter.subnets").subnets
  } catch {
    return []
  }
}

/**
 * Filters networks by BFF-side parameters that are not supported by Neutron's query API.
 */
const filterNetworksByBffParams = (
  networks: Network[],
  params: z.infer<typeof NetworkQueryParametersSchema>
): Network[] => {
  let filtered = networks

  // Search term filter (client-side search across name and description)
  if (params.searchTerm) {
    const searchLower = params.searchTerm.toLowerCase()
    filtered = filtered.filter((network) => {
      const name = network.name?.toLowerCase() || ""
      const description = network.description?.toLowerCase() || ""
      return name.includes(searchLower) || description.includes(searchLower)
    })
  }

  return filtered
}

/**
 * Picks only defined fields from an input object.
 * Used to build request bodies with only the fields the user provided.
 */
const pickDefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

/**
 * tRPC router for OpenStack Neutron Networks (L2).
 *
 * Exposes:
 * - list: GET /v2.0/networks
 * - getById: GET /v2.0/networks/{id} with enriched subnet details
 * - create: POST /v2.0/networks
 * - update: PUT /v2.0/networks/{id}
 * - delete: DELETE /v2.0/networks/{id}
 */
export const networksRouter = {
  /**
   * List all networks visible to the current project, with optional filtering.
   */
  list: projectScopedProcedure
    .input(NetworkQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<NetworkListItem[]> =>
      withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        // Build query params for Neutron API (forward applicable filters)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { project_id, searchTerm, ...neutronParams } = input
        const params = appendQueryParamsFromObject(neutronParams, LIST_NETWORKS_QUERY_KEY_MAP)

        const response = await network.get(withQuery(NETWORKS_BASE_URL, params))
        if (!response.ok) throw NetworkErrorHandlers.list(response)

        const data = await response.json()
        const parsed = parseOrThrow(NetworkListResponseSchema, data, "networksRouter.list")

        // Apply BFF-side filters (search term)
        const filtered = filterNetworksByBffParams(parsed.networks, input)

        return filtered
      }, "list networks")
    ),

  /**
   * Get a single network by ID, enriched with subnet details.
   */
  getById: projectScopedProcedure.input(NetworkIdInputSchema).query(async ({ input, ctx }): Promise<NetworkDetails> =>
    withErrorHandling(async () => {
      const network = getNetworkService(ctx)

      const response = await network.get(networkUrl(input.network_id))
      if (!response.ok) throw NetworkErrorHandlers.get(response, input.network_id)

      const data = await response.json()
      const parsed = parseOrThrow(NetworkResponseSchema, data, "networksRouter.getById")
      const baseNetwork = parsed.network

      // Fetch subnet details if the network has subnets
      const subnetDetails = baseNetwork.subnets?.length ? await fetchSubnetDetails(network, baseNetwork.subnets) : []

      return {
        ...baseNetwork,
        subnet_details: subnetDetails,
      }
    }, "get network by ID")
  ),

  /**
   * Create a new network.
   */
  create: projectScopedProcedure.input(NetworkCreateRequestSchema).mutation(async ({ input, ctx }): Promise<Network> =>
    withErrorHandling(async () => {
      const network = getNetworkService(ctx)

      // Build the request body with only defined fields
      const networkBody = pickDefined({
        name: input.name,
        description: input.description,
        admin_state_up: input.admin_state_up,
        shared: input.shared,
        "router:external": input["router:external"],
        "provider:network_type": input["provider:network_type"],
        "provider:physical_network": input["provider:physical_network"],
        "provider:segmentation_id": input["provider:segmentation_id"],
        mtu: input.mtu,
        availability_zone_hints: input.availability_zone_hints,
        qos_policy_id: input.qos_policy_id,
        port_security_enabled: input.port_security_enabled,
        dns_domain: input.dns_domain,
        vlan_transparent: input.vlan_transparent,
        project_id: input.project_id,
      })

      const response = await network.post(NETWORKS_BASE_URL, {
        body: JSON.stringify({ network: networkBody }),
      })

      if (!response.ok) throw NetworkErrorHandlers.create(response)

      const data = await response.json()
      const parsed = parseOrThrow(NetworkResponseSchema, data, "networksRouter.create")

      return parsed.network
    }, "create network")
  ),

  /**
   * Update an existing network.
   */
  update: projectScopedProcedure.input(NetworkUpdateRequestSchema).mutation(async ({ input, ctx }): Promise<Network> =>
    withErrorHandling(async () => {
      const network = getNetworkService(ctx)

      // Build the request body with only defined fields (excluding network_id and project_id)
      const networkBody = pickDefined({
        name: input.name,
        description: input.description,
        admin_state_up: input.admin_state_up,
        shared: input.shared,
        "router:external": input["router:external"],
        "provider:network_type": input["provider:network_type"],
        "provider:physical_network": input["provider:physical_network"],
        "provider:segmentation_id": input["provider:segmentation_id"],
        mtu: input.mtu,
        qos_policy_id: input.qos_policy_id,
        port_security_enabled: input.port_security_enabled,
        dns_domain: input.dns_domain,
      })

      const response = await network.put(networkUrl(input.network_id), {
        body: JSON.stringify({ network: networkBody }),
      })

      if (!response.ok) throw NetworkErrorHandlers.update(response, input.network_id)

      const data = await response.json()
      const parsed = parseOrThrow(NetworkResponseSchema, data, "networksRouter.update")

      return parsed.network
    }, "update network")
  ),

  /**
   * Delete a network by ID.
   */
  delete: projectScopedProcedure.input(NetworkIdInputSchema).mutation(async ({ input, ctx }): Promise<void> =>
    withErrorHandling(async () => {
      const network = getNetworkService(ctx)

      const response = await network.del(networkUrl(input.network_id))

      if (!response.ok) throw NetworkErrorHandlers.delete(response, input.network_id)
    }, "delete network")
  ),
}

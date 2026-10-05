import { TRPCError } from "@trpc/server"
import { projectScopedProcedure, projectScopedInputSchema } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { omit } from "@/server/helpers/object"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
import {
  Router,
  RouterListItem,
  RouterDetails,
  NetworkSummary,
  NetworkSummaryListResponseSchema,
  RouterInterfacePortSummary,
  RouterInterfacePortSummaryListResponseSchema,
  RouterInterface,
  RouterInterfaceInfo,
  RouterExtensionFlags,
  RouterQueryParametersSchema,
  RouterIdInputSchema,
  RouterCreateRequestSchema,
  RouterUpdateRequestSchema,
  RouterSetGatewayRequestSchema,
  RouterInterfaceRequestSchema,
  RouterListResponseSchema,
  RouterResponseSchema,
  RouterInterfaceInfoSchema,
  RouterPortListResponseSchema,
  SubnetSummaryListResponseSchema,
  ExtensionListResponseSchema,
  SubnetSummary,
} from "../types/router"
import {
  RouterErrorHandlers,
  pickDefined,
  buildExternalGatewayInfoBody,
  filterRoutersByBffParams,
  buildRouterInterfaces,
  collectSubnetIds,
  collectGatewayIds,
  applyGatewayNames,
  applyPrivateNetworks,
  groupPrivateNetworkIdsByRouter,
  chunk,
  ROUTER_INTERFACE_DEVICE_OWNERS,
  isRouterInterfacePort,
  getRouterExtensionFlags,
} from "../helpers/routerHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"

const ROUTERS_BASE_URL = "v2.0/routers"
const PORTS_BASE_URL = "v2.0/ports"
const SUBNETS_BASE_URL = "v2.0/subnets"
const NETWORKS_BASE_URL = "v2.0/networks"

/** Max router IDs per ports request (~2.5 KB of device_id params), keeps URLs well below proxy limits */
const ROUTER_INTERFACE_PORTS_CHUNK_SIZE = 50
const EXTENSIONS_BASE_URL = "v2.0/extensions"

const LIST_ROUTERS_QUERY_KEY_MAP: Record<string, string> = {
  tags_any: "tags-any",
  not_tags: "not-tags",
  not_tags_any: "not-tags-any",
}

const withQuery = (baseUrl: string, params: URLSearchParams): string => {
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

const routerUrl = (routerId: string, action?: "add_router_interface" | "remove_router_interface"): string => {
  const encodedId = validateAndEncodeResourceId(routerId, "Router")
  return action ? `${ROUTERS_BASE_URL}/${encodedId}/${action}` : `${ROUTERS_BASE_URL}/${encodedId}`
}

type NetworkService = ReturnType<typeof getNetworkService>

/**
 * Best-effort lookup of network names by ID in a single request.
 * Returns [] on any failure (e.g. not visible to the user) so callers fall back to IDs.
 */
const fetchNetworkSummaries = async (network: NetworkService, ids: string[]): Promise<NetworkSummary[]> => {
  if (ids.length === 0) return []
  try {
    const params = appendQueryParamsFromObject({ id: ids, fields: ["id", "name"] })
    const response = await network.get(withQuery(NETWORKS_BASE_URL, params))
    if (!response.ok) return []
    const data = await response.json()
    return parseOrThrow(NetworkSummaryListResponseSchema, data, "routersRouter.networks").networks
  } catch {
    return []
  }
}

/**
 * Best-effort lookup of subnet names by ID in a single request.
 * Returns [] on any failure (e.g. external subnets not visible to the user) so callers fall back to IDs.
 */
const fetchSubnetSummaries = async (
  network: NetworkService,
  ids: string[],
  fields: Array<"id" | "name" | "cidr"> = ["id", "name"]
): Promise<SubnetSummary[]> => {
  if (ids.length === 0) return []
  try {
    const params = appendQueryParamsFromObject({ id: ids, fields })
    const response = await network.get(withQuery(SUBNETS_BASE_URL, params))
    if (!response.ok) return []
    const data = await response.json()
    return parseOrThrow(SubnetSummaryListResponseSchema, data, "routersRouter.subnets").subnets
  } catch {
    return []
  }
}

/**
 * Best-effort lookup of the interface ports of many routers: one request per chunk of router IDs,
 * filtered by device_owner so gateway and SNAT ports are not transferred.
 * Returns null on any failure so callers can leave private networks unresolved.
 */
const fetchRouterInterfacePorts = async (
  network: NetworkService,
  routerIds: string[]
): Promise<RouterInterfacePortSummary[] | null> => {
  if (routerIds.length === 0) return []
  try {
    const portChunks = await Promise.all(
      chunk(routerIds, ROUTER_INTERFACE_PORTS_CHUNK_SIZE).map(async (ids) => {
        const params = appendQueryParamsFromObject({
          device_id: ids,
          device_owner: [...ROUTER_INTERFACE_DEVICE_OWNERS],
          fields: ["id", "device_id", "device_owner", "network_id"],
        })
        const response = await network.get(withQuery(PORTS_BASE_URL, params))
        if (!response.ok) throw new Error(`Failed to list router interface ports (HTTP ${response.status})`)
        const data = await response.json()
        return parseOrThrow(RouterInterfacePortSummaryListResponseSchema, data, "routersRouter.list.ports").ports
      })
    )
    return portChunks.flat()
  } catch {
    return null
  }
}

/**
 * tRPC router for OpenStack Neutron Routers (L3).
 *
 * Currently exposes:
 * - list: GET /v2.0/routers List routers with sorting and filtering; BFF-side search, status and has_gateway filters.
 *   Adds private networks (GET /v2.0/ports by device_id) and resolves external/private network and
 *   external subnet names (GET /v2.0/networks, /v2.0/subnets).
 * - getById: GET /v2.0/routers/{router_id} Show router details, external gateway enriched with
 *   network/subnet names (GET /v2.0/networks, /v2.0/subnets).
 * - create: POST /v2.0/routers Create router (optionally with external gateway).
 * - update: PUT /v2.0/routers/{router_id} Update name, description, admin state, extra routes, etc.
 * - setGateway: PUT /v2.0/routers/{router_id} with external_gateway_info.
 * - clearGateway: PUT /v2.0/routers/{router_id} with external_gateway_info = {}.
 * - addInterface: PUT /v2.0/routers/{router_id}/add_router_interface Attach a subnet or port.
 * - removeInterface: PUT /v2.0/routers/{router_id}/remove_router_interface Detach a subnet or port.
 * - delete: DELETE /v2.0/routers/{router_id} Delete router.
 *
 * - listInterfaces: GET /v2.0/ports?device_id={router_id} Router interfaces enriched with network name
 *   and subnet name/CIDR.
 * - listExtensions: GET /v2.0/extensions Flags for router-related extensions (dvr, extraroute, l3-ha, ...).
 *
 * External networks for the gateway selector are served by floatingIpRouter.listExternalNetworks.
 */
export const routersRouter = {
  list: projectScopedProcedure
    .input(RouterQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<RouterListItem[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, status, has_gateway, ...openstackFilters } = input
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject(openstackFilters, { keyMap: LIST_ROUTERS_QUERY_KEY_MAP })
        const response = await network.get(withQuery(ROUTERS_BASE_URL, queryParams))
        if (!response.ok) {
          throw RouterErrorHandlers.list(response)
        }

        const data = await response.json()
        const { routers } = parseOrThrow(RouterListResponseSchema, data, "routersRouter.list")

        const filteredRouters = filterBySearchParams(
          filterRoutersByBffParams(routers, { status, has_gateway }),
          searchTerm,
          ["id", "name", "description"]
        )

        // All lookups below are batched for the whole list (not per router) and best-effort.
        // 1. Private networks: interface ports of the listed routers
        const interfacePorts = await fetchRouterInterfacePorts(
          network,
          filteredRouters.map((router) => router.id)
        )
        const privateNetworkIdsByRouter = interfacePorts ? groupPrivateNetworkIdsByRouter(interfacePorts) : null

        // 2. Names: one networks request (external + private) and one subnets request (external)
        const { networkIds: gatewayNetworkIds, subnetIds } = collectGatewayIds(filteredRouters)
        const privateNetworkIds = [...(privateNetworkIdsByRouter?.values() ?? [])].flat()
        const networkIds = [...new Set([...gatewayNetworkIds, ...privateNetworkIds])]

        const [networks, subnets] = await Promise.all([
          fetchNetworkSummaries(network, networkIds),
          fetchSubnetSummaries(network, subnetIds),
        ])

        return applyPrivateNetworks(
          applyGatewayNames(filteredRouters, networks, subnets),
          privateNetworkIdsByRouter,
          networks
        )
      }, "list routers")
    }),

  getById: projectScopedProcedure.input(RouterIdInputSchema).query(async ({ input, ctx }): Promise<RouterDetails> => {
    return withErrorHandling(async () => {
      const { router_id } = input
      const network = getNetworkService(ctx)

      const response = await network.get(routerUrl(router_id))
      if (!response.ok) {
        throw RouterErrorHandlers.get(response, router_id)
      }

      const data = await response.json()
      const router = parseOrThrow(RouterResponseSchema, data, "routersRouter.getById").router

      // Best-effort gateway names, same as in `list`
      const { networkIds, subnetIds } = collectGatewayIds([router])
      const [networks, subnets] = await Promise.all([
        fetchNetworkSummaries(network, networkIds),
        fetchSubnetSummaries(network, subnetIds),
      ])

      const [routerWithNames] = applyGatewayNames([router], networks, subnets)
      return routerWithNames
    }, "show router details")
  }),

  create: projectScopedProcedure.input(RouterCreateRequestSchema).mutation(async ({ input, ctx }): Promise<Router> => {
    return withErrorHandling(async () => {
      const network = getNetworkService(ctx)
      // project_id is intentionally not sent: Neutron derives ownership from the (rescoped) token
      const { external_gateway_info, ...fields } = omit(input, "project_id")

      const requestBody = {
        router: {
          ...pickDefined(fields),
          ...(external_gateway_info && { external_gateway_info: buildExternalGatewayInfoBody(external_gateway_info) }),
        },
      }

      const response = await network.post(ROUTERS_BASE_URL, requestBody)
      if (!response.ok) {
        throw RouterErrorHandlers.create(response)
      }

      const data = await response.json()
      return parseOrThrow(RouterResponseSchema, data, "routersRouter.create").router
    }, "create router")
  }),

  update: projectScopedProcedure.input(RouterUpdateRequestSchema).mutation(async ({ input, ctx }): Promise<Router> => {
    return withErrorHandling(async () => {
      const { router_id, ...fields } = omit(input, "project_id")
      const network = getNetworkService(ctx)

      // Note: `routes` replaces the complete list of extra routes on the router
      const updateFields = pickDefined(fields)
      if (Object.keys(updateFields).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
      }

      const response = await network.put(routerUrl(router_id), { router: updateFields })
      if (!response.ok) {
        throw RouterErrorHandlers.update(response, router_id)
      }

      const data = await response.json()
      return parseOrThrow(RouterResponseSchema, data, "routersRouter.update").router
    }, "update router")
  }),

  setGateway: projectScopedProcedure
    .input(RouterSetGatewayRequestSchema)
    .mutation(async ({ input, ctx }): Promise<Router> => {
      return withErrorHandling(async () => {
        const { router_id, external_gateway_info } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          router: { external_gateway_info: buildExternalGatewayInfoBody(external_gateway_info) },
        }

        const response = await network.put(routerUrl(router_id), requestBody)
        if (!response.ok) {
          throw RouterErrorHandlers.setGateway(response, router_id)
        }

        const data = await response.json()
        return parseOrThrow(RouterResponseSchema, data, "routersRouter.setGateway").router
      }, "set router external gateway")
    }),

  clearGateway: projectScopedProcedure.input(RouterIdInputSchema).mutation(async ({ input, ctx }): Promise<Router> => {
    return withErrorHandling(async () => {
      const { router_id } = input
      const network = getNetworkService(ctx)

      // An empty object removes the gateway (same as `openstack router unset --external-gateway`)
      const response = await network.put(routerUrl(router_id), { router: { external_gateway_info: {} } })
      if (!response.ok) {
        throw RouterErrorHandlers.clearGateway(response, router_id)
      }

      const data = await response.json()
      return parseOrThrow(RouterResponseSchema, data, "routersRouter.clearGateway").router
    }, "clear router external gateway")
  }),

  addInterface: projectScopedProcedure
    .input(RouterInterfaceRequestSchema)
    .mutation(async ({ input, ctx }): Promise<RouterInterfaceInfo> => {
      return withErrorHandling(async () => {
        const { router_id, subnet_id, port_id } = input
        const network = getNetworkService(ctx)

        const requestBody = subnet_id ? { subnet_id } : { port_id }
        const response = await network.put(routerUrl(router_id, "add_router_interface"), requestBody)
        if (!response.ok) {
          throw RouterErrorHandlers.addInterface(response, router_id)
        }

        const data = await response.json()
        return parseOrThrow(RouterInterfaceInfoSchema, data, "routersRouter.addInterface")
      }, "add router interface")
    }),

  removeInterface: projectScopedProcedure
    .input(RouterInterfaceRequestSchema)
    .mutation(async ({ input, ctx }): Promise<RouterInterfaceInfo> => {
      return withErrorHandling(async () => {
        const { router_id, subnet_id, port_id } = input
        const network = getNetworkService(ctx)

        const requestBody = subnet_id ? { subnet_id } : { port_id }
        const response = await network.put(routerUrl(router_id, "remove_router_interface"), requestBody)
        if (!response.ok) {
          throw RouterErrorHandlers.removeInterface(response, router_id)
        }

        const data = await response.json()
        return parseOrThrow(RouterInterfaceInfoSchema, data, "routersRouter.removeInterface")
      }, "remove router interface")
    }),

  delete: projectScopedProcedure.input(RouterIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { router_id } = input
      const network = getNetworkService(ctx)

      // OpenStack DELETE returns 204 No Content on success; 409 if interfaces are still attached
      const response = await network.del(routerUrl(router_id))
      if (!response.ok) {
        throw RouterErrorHandlers.delete(response, router_id)
      }

      return true
    }, "delete router")
  }),

  listInterfaces: projectScopedProcedure
    .input(RouterIdInputSchema)
    .query(async ({ input, ctx }): Promise<RouterInterface[]> => {
      return withErrorHandling(async () => {
        const { router_id } = input
        const network = getNetworkService(ctx)

        // Validates the ID; it is sent as a query param (encoded by URLSearchParams), not as a path segment
        validateAndEncodeResourceId(router_id, "Router")

        const portParams = appendQueryParamsFromObject({
          device_id: router_id,
          fields: ["id", "name", "network_id", "device_owner", "status", "admin_state_up", "mac_address", "fixed_ips"],
        })
        const portsResponse = await network.get(withQuery(PORTS_BASE_URL, portParams))
        if (!portsResponse.ok) {
          throw RouterErrorHandlers.listInterfaces(portsResponse, router_id)
        }

        const portsData = await portsResponse.json()
        const { ports } = parseOrThrow(RouterPortListResponseSchema, portsData, "routersRouter.listInterfaces")
        const interfacePorts = ports.filter(isRouterInterfacePort)

        // Enrich with subnet name/CIDR and network name in parallel.
        // Degrade gracefully (IDs only) if the lookups fail.
        const subnetIds = collectSubnetIds(interfacePorts)
        const networkIds = [...new Set(interfacePorts.map((port) => port.network_id))]
        const [subnets, networks] = await Promise.all([
          fetchSubnetSummaries(network, subnetIds, ["id", "name", "cidr"]),
          fetchNetworkSummaries(network, networkIds),
        ])

        return buildRouterInterfaces(interfacePorts, subnets, networks)
      }, "list router interfaces")
    }),

  listExtensions: projectScopedProcedure
    .input(projectScopedInputSchema)
    .query(async ({ ctx }): Promise<RouterExtensionFlags> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const response = await network.get(EXTENSIONS_BASE_URL)
        if (!response.ok) {
          throw RouterErrorHandlers.listExtensions(response)
        }

        const data = await response.json()
        const { extensions } = parseOrThrow(ExtensionListResponseSchema, data, "routersRouter.listExtensions")

        return getRouterExtensionFlags(extensions.map((extension) => extension.alias))
      }, "list router-related network extensions")
    }),
}

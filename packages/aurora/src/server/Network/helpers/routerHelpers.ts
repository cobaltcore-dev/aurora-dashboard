import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { ErrorHandler } from "./errorHandling"
import { HTTP_STATUS_ERROR_MAP } from "./index"
import type {
  Router,
  RouterListItem,
  RouterPort,
  RouterInterface,
  SubnetSummary,
  NetworkSummary,
  RouterInterfacePortSummary,
  ExternalGatewayInfoInput,
  RouterExtensionFlags,
} from "../types/router"

type ErrorResponse = { status?: number; statusText?: string }

const QUOTA_EXCEEDED_MESSAGE =
  "Router quota exceeded. Please delete unused resources or contact your administrator to increase your quota."

/**
 * Neutron reports OverQuota as 409 Conflict (not 413), so every router 409 override
 * checks for a quota message first and only then falls back to the operation-specific text.
 */
const conflict = (message: string) => (response: ErrorResponse) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[409],
    message: /quota/i.test(response.statusText ?? "") ? QUOTA_EXCEEDED_MESSAGE : message,
  })

const badRequest = (message: string) => (response: ErrorResponse) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[400],
    message: `${message}${response.statusText ? ` (${response.statusText})` : ""}`,
  })

const notFound = (message: (resourceLabel?: string) => string) => (_response: ErrorResponse, resourceLabel?: string) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[404],
    message: message(resourceLabel),
  })

/**
 * Router error handlers built on the shared network ErrorHandler
 * (defaults for 400/401/403/404/409/412), with router-specific overrides
 * where Neutron's semantics warrant a clearer message.
 *
 * Usage: `throw RouterErrorHandlers.delete(response, routerId)`
 */
export const RouterErrorHandlers = {
  list: ErrorHandler("Router"),

  get: ErrorHandler("Router", {
    404: notFound((routerId) => `Router ${routerId} was not found.`),
  }),

  create: ErrorHandler("Router", {
    404: notFound(() => "The selected external network or subnet was not found."),
    409: conflict(
      "The requested external IP address is already in use or the external network has no free IP addresses."
    ),
  }),

  update: ErrorHandler("Router", {
    404: notFound((routerId) => `Router ${routerId} was not found.`),
    409: conflict(
      "The router is in a state that doesn't allow this change. Distributed/HA mode can only be changed while the admin state is DOWN."
    ),
  }),

  setGateway: ErrorHandler("Router", {
    404: notFound((routerId) => `Router ${routerId} or the selected external network was not found.`),
    409: conflict(
      "The requested external IP address is already in use or the external network has no free IP addresses."
    ),
  }),

  clearGateway: ErrorHandler("Router", {
    404: notFound((routerId) => `Router ${routerId} was not found.`),
    409: conflict(
      "The gateway can't be cleared while floating IPs are still associated through this router. Disassociate them first."
    ),
  }),

  addInterface: ErrorHandler("Router", {
    // Neutron returns 400 for: subnet already attached, no gateway IP, overlapping CIDRs
    400: badRequest(
      "The interface can't be added. The subnet may already be attached, have no gateway IP, or overlap with a subnet on this router"
    ),
    404: notFound((routerId) => `Router ${routerId} or the selected subnet/port was not found.`),
    409: conflict("The subnet or port is already in use by another router, or its IP address is already allocated."),
  }),

  removeInterface: ErrorHandler("Router", {
    404: notFound((routerId) => `The interface is not attached to router ${routerId}.`),
    409: conflict("The interface can't be removed while floating IPs are still associated with ports on this subnet."),
  }),

  delete: ErrorHandler("Router", {
    404: notFound((routerId) => `Router ${routerId} was not found.`),
    409: conflict("The router still has attached interfaces. Remove all interfaces before deleting it."),
  }),

  listInterfaces: ErrorHandler("Router"),

  listExtensions: ErrorHandler("Router"),
}

type RouterErrorHandler = (response: ErrorResponse, resourceLabel?: string) => TRPCError

/**
 * Runs a Neutron request and maps any failure through the operation's router error handler.
 *
 * signal-openstack rejects every non-2xx response with SignalOpenstackApiError, so a plain
 * `if (!response.ok)` check never runs and the error would reach `withErrorHandling` as INTERNAL_SERVER_ERROR.
 * The error's `message` is Neutron's own message parsed from the JSON body (e.g. NeutronError.message
 * "Quota exceeded for resources: ['router']."), so it is passed to the handler as `statusText`.
 * Network failures are wrapped by the client as SignalOpenstackApiError with status 500 and end up in the default handler.
 * The `!response.ok` branch only guards against clients that resolve with error responses.
 */
export const requestOrThrow = async <T extends { ok: boolean; status: number; statusText?: string }>(
  request: () => Promise<T>,
  handleError: RouterErrorHandler,
  resourceLabel?: string
): Promise<T> => {
  let response: T
  try {
    response = await request()
  } catch (error) {
    if (error instanceof SignalOpenstackApiError) {
      throw handleError({ status: error.statusCode, statusText: error.message }, resourceLabel)
    }
    throw error
  }

  if (!response.ok) throw handleError(response, resourceLabel)
  return response
}

/* -------------------------------------------------------------------------- */
/*                               Request builders                             */
/* -------------------------------------------------------------------------- */

/** Returns a shallow copy of `obj` without keys whose value is `undefined`. */
export const pickDefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>

export const buildExternalGatewayInfoBody = (info: ExternalGatewayInfoInput) => ({
  network_id: info.network_id,
  ...(info.enable_snat !== undefined && { enable_snat: info.enable_snat }),
  ...(info.external_fixed_ips !== undefined && {
    external_fixed_ips: info.external_fixed_ips.map((fixedIp) => pickDefined(fixedIp)),
  }),
})

/* -------------------------------------------------------------------------- */
/*                               Response shaping                             */
/* -------------------------------------------------------------------------- */

/** Filters Neutron doesn't support for routers; applied BFF-side. */
export const filterRoutersByBffParams = (
  routers: Router[],
  { status, has_gateway }: { status?: string; has_gateway?: boolean }
): Router[] =>
  routers.filter((router) => {
    if (status && router.status.toUpperCase() !== status.toUpperCase()) return false
    if (has_gateway !== undefined && Boolean(router.external_gateway_info) !== has_gateway) return false
    return true
  })

/** Unique external network and subnet IDs referenced by the routers' external gateways. */
export const collectGatewayIds = (routers: Router[]): { networkIds: string[]; subnetIds: string[] } => {
  const networkIds = new Set<string>()
  const subnetIds = new Set<string>()

  for (const router of routers) {
    const gateway = router.external_gateway_info
    if (!gateway) continue
    networkIds.add(gateway.network_id)
    for (const fixedIp of gateway.external_fixed_ips ?? []) {
      subnetIds.add(fixedIp.subnet_id)
    }
  }

  return { networkIds: [...networkIds], subnetIds: [...subnetIds] }
}

/**
 * Enriches the routers' external gateways with network and subnet names.
 * IDs without a matching (or with an empty) name are left without a name, so the UI can fall back to the ID.
 */
export const applyGatewayNames = (
  routers: Router[],
  networks: NetworkSummary[] = [],
  subnets: SubnetSummary[] = []
): RouterListItem[] => {
  const networkNames = new Map(networks.map((network) => [network.id, network.name || undefined]))
  const subnetNames = new Map(subnets.map((subnet) => [subnet.id, subnet.name || undefined]))

  return routers.map((router) => {
    const gateway = router.external_gateway_info
    if (!gateway) return router

    return {
      ...router,
      external_gateway_info: {
        ...gateway,
        network_name: networkNames.get(gateway.network_id),
        external_fixed_ips: gateway.external_fixed_ips?.map((fixedIp) => ({
          ...fixedIp,
          subnet_name: subnetNames.get(fixedIp.subnet_id),
        })),
      },
    }
  })
}

/**
 * Device owners of ports that represent router interfaces towards internal subnets.
 * Excludes the gateway port (network:router_gateway) and DVR SNAT ports (network:router_centralized_snat).
 */
export const ROUTER_INTERFACE_DEVICE_OWNERS: ReadonlySet<string> = new Set([
  "network:router_interface",
  "network:router_interface_distributed",
  "network:ha_router_replicated_interface",
])

export const isRouterInterfacePort = (port: Pick<RouterPort, "device_owner">): boolean =>
  ROUTER_INTERFACE_DEVICE_OWNERS.has(port.device_owner)

/** Splits items into chunks of at most `size` items (e.g. to keep query strings short). */
export const chunk = <T>(items: T[], size: number): T[][] => {
  if (size < 1) throw new Error("Chunk size must be at least 1")
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * Groups interface ports by router (device_id) into unique private network IDs, preserving first-seen order.
 * Non-interface ports (gateway, SNAT) are ignored.
 */
export const groupPrivateNetworkIdsByRouter = (ports: RouterInterfacePortSummary[]): Map<string, string[]> => {
  const byRouter = new Map<string, Set<string>>()

  for (const port of ports) {
    if (!isRouterInterfacePort(port)) continue
    const networkIds = byRouter.get(port.device_id) ?? new Set<string>()
    networkIds.add(port.network_id)
    byRouter.set(port.device_id, networkIds)
  }

  return new Map([...byRouter].map(([routerId, networkIds]) => [routerId, [...networkIds]]))
}

/**
 * Adds `private_networks` (with names where known) to each router.
 * When `privateNetworkIdsByRouter` is null (lookup failed), routers are returned unchanged,
 * so `private_networks` stays undefined and the UI can tell "unknown" from "none".
 */
export const applyPrivateNetworks = (
  routers: RouterListItem[],
  privateNetworkIdsByRouter: Map<string, string[]> | null,
  networks: NetworkSummary[] = []
): RouterListItem[] => {
  if (!privateNetworkIdsByRouter) return routers

  const networkNames = new Map(networks.map((network) => [network.id, network.name || undefined]))

  return routers.map((router) => ({
    ...router,
    private_networks: (privateNetworkIdsByRouter.get(router.id) ?? []).map((networkId) => ({
      network_id: networkId,
      network_name: networkNames.get(networkId),
    })),
  }))
}

export const collectSubnetIds = (ports: RouterPort[]): string[] => [
  ...new Set(ports.flatMap((port) => port.fixed_ips.map((fixedIp) => fixedIp.subnet_id))),
]

export const buildRouterInterfaces = (
  ports: RouterPort[],
  subnets: SubnetSummary[] = [],
  networks: NetworkSummary[] = []
): RouterInterface[] => {
  const subnetsById = new Map(subnets.map((subnet) => [subnet.id, subnet]))
  const networkNames = new Map(networks.map((network) => [network.id, network.name || undefined]))

  return ports.filter(isRouterInterfacePort).map((port) => ({
    port_id: port.id,
    port_name: port.name,
    network_id: port.network_id,
    network_name: networkNames.get(port.network_id),
    device_owner: port.device_owner,
    status: port.status,
    admin_state_up: port.admin_state_up,
    mac_address: port.mac_address,
    fixed_ips: port.fixed_ips.map((fixedIp) => ({
      subnet_id: fixedIp.subnet_id,
      subnet_name: subnetsById.get(fixedIp.subnet_id)?.name,
      subnet_cidr: subnetsById.get(fixedIp.subnet_id)?.cidr,
      ip_address: fixedIp.ip_address,
    })),
  }))
}

export const getRouterExtensionFlags = (aliases: Iterable<string>): RouterExtensionFlags => {
  const enabled = new Set(aliases)
  return {
    dvr: enabled.has("dvr"),
    l3Ha: enabled.has("l3-ha"),
    extraRoute: enabled.has("extraroute"),
    extGwMode: enabled.has("ext-gw-mode"),
    ndpProxy: enabled.has("router-extend-ndp-proxy"),
    externalGatewayMultihoming: enabled.has("external-gateway-multihoming"),
    availabilityZone: enabled.has("router_availability_zone"),
  }
}

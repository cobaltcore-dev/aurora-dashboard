import { TRPCError } from "@trpc/server"
import { ErrorHandler } from "./errorHandling"
import { HTTP_STATUS_ERROR_MAP } from "./index"
import type {
  Router,
  RouterListItem,
  RouterPort,
  RouterInterface,
  SubnetSummary,
  NetworkSummary,
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

export const isRouterInterfacePort = (port: RouterPort): boolean =>
  ROUTER_INTERFACE_DEVICE_OWNERS.has(port.device_owner)

export const collectSubnetIds = (ports: RouterPort[]): string[] => [
  ...new Set(ports.flatMap((port) => port.fixed_ips.map((fixedIp) => fixedIp.subnet_id))),
]

export const buildRouterInterfaces = (ports: RouterPort[], subnets: SubnetSummary[] = []): RouterInterface[] => {
  const subnetsById = new Map(subnets.map((subnet) => [subnet.id, subnet]))

  return ports.filter(isRouterInterfacePort).map((port) => ({
    port_id: port.id,
    port_name: port.name,
    network_id: port.network_id,
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

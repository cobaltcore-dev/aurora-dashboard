import { isIP } from "node:net"
import { TRPCError } from "@trpc/server"
import { ErrorHandler } from "./errorHandling"
import { HTTP_STATUS_ERROR_MAP } from "./index"
import { pickDefined } from "./requestHelpers"
import type { NetworkSummary, SecurityGroupSummary, SubnetSummary } from "../types/index"
import type {
  Port,
  PortListItem,
  PortDetails,
  PortCreateRequest,
  PortUpdateRequest,
  PortFixedIpItem,
} from "../types/port"

type ErrorResponse = { status?: number; statusText?: string }

const QUOTA_EXCEEDED_MESSAGE =
  "Port quota exceeded. Delete unused resources or contact an administrator to increase the quota."

/**
 * Neutron reports OverQuota as 409 Conflict (not 413), so every port 409 override
 * checks for a quota message first and only then falls back to the operation-specific text.
 */
const conflict = (message: string) => (response: ErrorResponse) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[409],
    message: /quota/i.test(response.statusText ?? "") ? QUOTA_EXCEEDED_MESSAGE : message,
  })

const notFound = (message: (resourceLabel?: string) => string) => (_response: ErrorResponse, resourceLabel?: string) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[404],
    message: message(resourceLabel),
  })

/**
 * Port error handlers built on the shared network ErrorHandler
 * (defaults for 400/401/403/404/409/412), with port-specific overrides
 * where Neutron's semantics warrant a clearer message.
 *
 * Usage: `throw PortErrorHandlers.delete(response, portId)`
 */
export const PortErrorHandlers = {
  list: ErrorHandler("Port"),

  get: ErrorHandler("Port", {
    404: notFound((portId) => `Port ${portId} was not found.`),
  }),

  create: ErrorHandler("Port", {
    404: notFound(() => "The selected network, subnet or security group was not found."),
    // Neutron returns 409 for: IP address already allocated, MAC address in use, no free IP addresses on the subnet
    409: conflict("The requested IP or MAC address is already in use, or the subnet has no free IP addresses left."),
  }),

  update: ErrorHandler("Port", {
    404: notFound((portId) => `Port ${portId} or a referenced subnet or security group was not found.`),
    409: conflict("The requested IP or MAC address is already in use, or the subnet has no free IP addresses left."),
  }),

  delete: ErrorHandler("Port", {
    404: notFound((portId) => `Port ${portId} was not found.`),
    // e.g. router interface ports can only be removed via the router (ServicePortInUse)
    409: conflict(
      "The port is still in use by another resource (e.g. a router interface) and can't be deleted directly. Detach it first."
    ),
  }),
}

/* -------------------------------------------------------------------------- */
/*                               Request builders                             */
/* -------------------------------------------------------------------------- */

type PortWritableFields = Omit<PortCreateRequest, "project_id"> | Omit<PortUpdateRequest, "project_id" | "port_id">

/**
 * Builds the `port` body for POST / PUT /v2.0/ports: only fields that were provided,
 * with undefined keys dropped from nested fixed IPs and allowed address pairs.
 */
export const buildPortBody = (fields: PortWritableFields) => {
  const { fixed_ips, allowed_address_pairs, ...rest } = fields
  return {
    ...pickDefined(rest),
    ...(fixed_ips !== undefined && { fixed_ips: fixed_ips.map((fixedIp) => pickDefined(fixedIp)) }),
    ...(allowed_address_pairs !== undefined && {
      allowed_address_pairs: allowed_address_pairs.map((pair) => pickDefined(pair)),
    }),
  }
}

/* -------------------------------------------------------------------------- */
/*                               Response shaping                             */
/* -------------------------------------------------------------------------- */

/** IP version of an address, or undefined if it is not a valid IP. */
export const getIpVersion = (ipAddress: string): 4 | 6 | undefined => {
  const version = isIP(ipAddress)
  return version === 4 || version === 6 ? version : undefined
}

/** Unique network and subnet IDs referenced by the ports. */
export const collectPortLookupIds = (ports: Port[]): { networkIds: string[]; subnetIds: string[] } => ({
  networkIds: [...new Set(ports.map((port) => port.network_id))],
  subnetIds: [...new Set(ports.flatMap((port) => port.fixed_ips.map((fixedIp) => fixedIp.subnet_id)))],
})

/**
 * Enriches ports with the network name and, for every fixed IP, the IP version and subnet name.
 * IDs without a matching (or with an empty) name are left without a name, so the UI can fall back to the ID.
 */
export const applyPortNames = (
  ports: Port[],
  networks: NetworkSummary[] = [],
  subnets: SubnetSummary[] = []
): PortListItem[] => {
  const networkNames = new Map(networks.map((network) => [network.id, network.name || undefined]))
  const subnetNames = new Map(subnets.map((subnet) => [subnet.id, subnet.name || undefined]))

  return ports.map((port) => ({
    ...port,
    network_name: networkNames.get(port.network_id),
    fixed_ips: port.fixed_ips.map((fixedIp): PortFixedIpItem => ({
      ...fixedIp,
      ip_version: getIpVersion(fixedIp.ip_address),
      subnet_name: subnetNames.get(fixedIp.subnet_id),
    })),
  }))
}

/** Resolves the port's security group IDs to references with names (undefined where unknown). */
export const applySecurityGroupNames = (
  port: PortListItem,
  securityGroups: SecurityGroupSummary[] = []
): PortDetails => {
  const securityGroupNames = new Map(securityGroups.map((group) => [group.id, group.name || undefined]))

  return {
    ...port,
    security_groups: port.security_groups.map((id) => ({ id, name: securityGroupNames.get(id) })),
  }
}

/**
 * BFF-side search across everything the ports list shows: ID, name, description, network (ID and name),
 * fixed IPs (address, subnet ID and name), MAC address and device (owner and ID). Case-insensitive substring match.
 */
export const filterPortsBySearchTerm = (ports: PortListItem[], searchTerm?: string): PortListItem[] => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term) return ports

  return ports.filter((port) => {
    const values = [
      port.id,
      port.name,
      port.description,
      port.network_id,
      port.network_name,
      port.mac_address,
      port.device_id,
      port.device_owner,
      ...port.fixed_ips.flatMap((fixedIp) => [fixedIp.ip_address, fixedIp.subnet_id, fixedIp.subnet_name]),
    ]
    return values.some((value) => value?.toLowerCase().includes(term))
  })
}

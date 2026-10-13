import { TRPCError } from "@trpc/server"
import { ErrorHandler } from "./errorHandling"
import { HTTP_STATUS_ERROR_MAP } from "./index"
import { pickDefined } from "./requestHelpers"
import type { SortDir, SubnetSummary } from "../types/index"
import type {
  Network,
  NetworkListItem,
  NetworkCreateRequest,
  NetworkUpdateRequest,
  NetworkQueryParameters,
} from "../types/network"

type ErrorResponse = { status?: number; statusText?: string }

const QUOTA_EXCEEDED_MESSAGE =
  "Network quota exceeded. Delete unused resources or contact an administrator to increase the quota."

const ADMIN_ONLY_MESSAGE =
  "You are not allowed to perform this change. Shared and external networks, provider attributes and some MTU changes require admin rights."

/**
 * Neutron reports OverQuota as 409 Conflict (not 413), so every network 409 override
 * checks for a quota message first and only then falls back to the operation-specific text.
 */
const conflict = (message: string) => (response: ErrorResponse) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[409],
    message: /quota/i.test(response.statusText ?? "") ? QUOTA_EXCEEDED_MESSAGE : message,
  })

const forbidden = (message: string) => (response: ErrorResponse) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[403],
    message: `${message}${response.statusText ? ` (${response.statusText})` : ""}`,
  })

const notFound = (message: (resourceLabel?: string) => string) => (_response: ErrorResponse, resourceLabel?: string) =>
  new TRPCError({
    code: HTTP_STATUS_ERROR_MAP[404],
    message: message(resourceLabel),
  })

/**
 * Network error handlers built on the shared network ErrorHandler
 * (defaults for 400/401/403/404/409/412), with network-specific overrides
 * where Neutron's semantics warrant a clearer message.
 *
 * Usage: `throw NetworkErrorHandlers.delete(response, networkId)`
 */
export const NetworkErrorHandlers = {
  list: ErrorHandler("Network"),

  get: ErrorHandler("Network", {
    404: notFound((networkId) => `Network ${networkId} was not found.`),
  }),

  create: ErrorHandler("Network", {
    403: forbidden(ADMIN_ONLY_MESSAGE),
    409: conflict("The network can't be created with these settings."),
  }),

  update: ErrorHandler("Network", {
    403: forbidden(ADMIN_ONLY_MESSAGE),
    404: notFound((networkId) => `Network ${networkId} was not found.`),
    // e.g. InvalidSharedSetting: sharing can't be disabled while other projects use the network
    409: conflict(
      "The network can't be changed in its current state. Sharing can't be disabled while other projects still use the network."
    ),
  }),

  delete: ErrorHandler("Network", {
    404: notFound((networkId) => `Network ${networkId} was not found.`),
    // NetworkInUse: Neutron removes subnets and DHCP ports itself, but not ports of instances or routers
    409: conflict(
      "The network still has ports in use (e.g. instances or router interfaces). Delete or detach them before deleting the network."
    ),
  }),

  setTags: ErrorHandler("Network", {
    404: notFound((networkId) => `Network ${networkId} was not found.`),
  }),

  listSubnets: ErrorHandler("Network"),
}

/* -------------------------------------------------------------------------- */
/*                               Request builders                             */
/* -------------------------------------------------------------------------- */

type NetworkWritableFields =
  Omit<NetworkCreateRequest, "project_id"> | Omit<NetworkUpdateRequest, "project_id" | "network_id">

/** Builds the `network` body for POST / PUT /v2.0/networks: only fields that were provided. */
export const buildNetworkBody = (fields: NetworkWritableFields): Partial<NetworkWritableFields> => pickDefined(fields)

/* -------------------------------------------------------------------------- */
/*                               Response shaping                             */
/* -------------------------------------------------------------------------- */

/**
 * Which list requests to send, depending on the `shared` filter.
 * Neutron's `project_id` filter hides shared networks owned by other projects, which the project can still use,
 * so the own networks (`project_id`) and the shared networks (`shared=true`) are requested separately and merged.
 */
export const getNetworkListScopes = (shared: boolean | undefined): Array<"own" | "shared"> => {
  if (shared === true) return ["shared"]
  if (shared === false) return ["own"]
  return ["own", "shared"]
}

/** Merges network lists by ID, keeping the first occurrence and the original order. */
export const mergeNetworks = (...lists: Network[][]): Network[] => {
  const byId = new Map<string, Network>()
  for (const network of lists.flat()) {
    if (!byId.has(network.id)) byId.set(network.id, network)
  }
  return [...byId.values()]
}

const compareValues = (a: unknown, b: unknown): number => {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b)
  if (Array.isArray(a) && Array.isArray(b)) return a.join(",").localeCompare(b.join(","))
  return String(a).localeCompare(String(b))
}

/**
 * Sorts merged networks like Neutron would. Needed because the own and shared lists are each sorted by Neutron,
 * but not their concatenation. Missing values sort last. Without a sort key the order is unchanged.
 */
export const sortNetworks = (
  networks: Network[],
  sortKey: NetworkQueryParameters["sort_key"],
  sortDir: SortDir = "asc"
): Network[] => {
  if (!sortKey) return networks
  const direction = sortDir === "desc" ? -1 : 1
  return [...networks].sort((a, b) => direction * compareValues(a[sortKey], b[sortKey]))
}

/** Unique subnet IDs referenced by the networks. */
export const collectSubnetIds = (networks: Network[]): string[] => [
  ...new Set(networks.flatMap((network) => network.subnets)),
]

/** Adds `subnet_details` (subnet IDs with names where known) to each network. */
export const applySubnetNames = (networks: Network[], subnets: SubnetSummary[] = []): NetworkListItem[] => {
  const subnetNames = new Map(subnets.map((subnet) => [subnet.id, subnet.name || undefined]))

  return networks.map((network) => ({
    ...network,
    subnet_details: network.subnets.map((subnetId) => ({ id: subnetId, name: subnetNames.get(subnetId) })),
  }))
}

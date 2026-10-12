import { ErrorHandler } from "./errorHandling"
import type { Network, NetworkListItem } from "../types/network"

/**
 * Network error handlers built on the shared network ErrorHandler
 * (defaults for 400/401/403/404/409/412). Read-only operations, so no overrides are needed yet.
 */
export const NetworkErrorHandlers = {
  list: ErrorHandler("Network"),
  get: ErrorHandler("Network"),
  listSubnets: ErrorHandler("Network"),
}

/**
 * Maps a raw Neutron network to the shape the UI consumes:
 * `router:external` becomes `external` and the `subnets` ID array becomes a `subnet_count`.
 */
export const toNetworkListItem = (network: Network): NetworkListItem => {
  const { "router:external": external, subnets, ...rest } = network
  return {
    ...rest,
    subnets,
    external: external ?? false,
    subnet_count: subnets.length,
  }
}

/** Filters Neutron doesn't support directly; applied BFF-side. */
export const filterNetworksByBffParams = (networks: Network[], { status }: { status?: string }): Network[] =>
  networks.filter((network) => {
    if (status && network.status.toUpperCase() !== status.toUpperCase()) return false
    return true
  })

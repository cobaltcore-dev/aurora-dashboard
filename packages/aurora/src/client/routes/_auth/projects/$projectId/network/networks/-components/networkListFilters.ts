/**
 * Filter values of the networks list, shared by the route's search validation and the list's filter UI.
 * Defined on the client: value imports from server type files would pull server code into the browser bundle.
 */
export const NETWORK_STATUS_FILTER_VALUES = ["ACTIVE", "DOWN", "BUILD", "ERROR"] as const
export const NETWORK_SHARED_FILTER_VALUES = ["true", "false"] as const

export type NetworkStatusFilter = (typeof NETWORK_STATUS_FILTER_VALUES)[number]
export type NetworkSharedFilter = (typeof NETWORK_SHARED_FILTER_VALUES)[number]

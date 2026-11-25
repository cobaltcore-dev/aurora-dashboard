import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"

// Import types only, never values, from server files (see shareListFilters.ts for why)
import type { ShareExportLocation, ShareReplica } from "@/server/SharedFileSystem/types/share"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"

/**
 * Valid tab identifiers for the share detail page
 */
export const SHARE_DETAILS_TABS = ["export-locations", "snapshots", "replicas"] as const

export type ShareDetailsTab = (typeof SHARE_DETAILS_TABS)[number]

export const DEFAULT_SHARE_DETAILS_TAB: ShareDetailsTab = "export-locations"

/**
 * Type guard for ShareDetailsTab
 */
export function isShareDetailsTab(value: unknown): value is ShareDetailsTab {
  return typeof value === "string" && SHARE_DETAILS_TABS.includes(value as ShareDetailsTab)
}

/**
 * Returns the visible tabs for a share.
 * Always returns all three tabs — the replicas tab shows an empty state when there are none.
 * (Manila's has_replicas flag may be stale after replica creation, so we don't rely on it.)
 */
export function getShareDetailsTabs(): ShareDetailsTab[] {
  return ["export-locations", "snapshots", "replicas"]
}

/**
 * Returns a priority rank for snapshot status (E3).
 * Lower rank = higher attention priority (errors first).
 * - 0: error states
 * - 1: transitional states
 * - 2: available
 * - 3: missing or unknown
 */
export function getSnapshotStatusRank(status: string | null | undefined): number {
  if (!status) return 3

  const normalized = status.toLowerCase().trim()

  // Error states: explicit errors or anything ending in _error
  if (normalized === "error" || normalized === "error_deleting" || normalized.endsWith("_error")) {
    return 0
  }

  // Transitional states
  const transitional = [
    "creating",
    "deleting",
    "restoring",
    "migrating",
    "migrating_to",
    "manage_starting",
    "unmanage_starting",
  ]
  if (transitional.includes(normalized)) {
    return 1
  }

  // Available
  if (normalized === "available") {
    return 2
  }

  // Unknown
  return 3
}

/**
 * Returns a priority rank for replica state (E3).
 * Lower rank = higher attention priority (errors first).
 * - 0: error
 * - 1: out_of_sync
 * - 2: in_sync
 * - 3: active
 * - 4: missing or unknown
 */
export function getReplicaStateRank(replicaState: string | null | undefined): number {
  if (!replicaState) return 4

  const normalized = replicaState.toLowerCase().trim()

  if (normalized === "error") return 0
  if (normalized === "out_of_sync") return 1
  if (normalized === "in_sync") return 2
  if (normalized === "active") return 3

  return 4
}

/**
 * Sorts snapshots by status rank, then name/ID, then id.
 * Returns a new array; does not mutate input.
 */
export function sortShareSnapshots(snapshots: ShareSnapshot[]): ShareSnapshot[] {
  return [...snapshots].sort((a, b) => {
    // Status rank
    const rankA = getSnapshotStatusRank(a.status)
    const rankB = getSnapshotStatusRank(b.status)
    if (rankA !== rankB) return rankA - rankB

    // Name or ID, case-insensitive with numeric support
    const nameA = a.name || a.id
    const nameB = b.name || b.id
    const nameCompare = nameA.localeCompare(nameB, undefined, {
      numeric: true,
      sensitivity: "base",
    })
    if (nameCompare !== 0) return nameCompare

    // ID as final tie-breaker
    return a.id.localeCompare(b.id)
  })
}

/**
 * Sorts replicas by replica state rank, then id.
 * Returns a new array; does not mutate input.
 */
export function sortShareReplicas(replicas: ShareReplica[]): ShareReplica[] {
  return [...replicas].sort((a, b) => {
    // Replica state rank
    const rankA = getReplicaStateRank(a.replica_state)
    const rankB = getReplicaStateRank(b.replica_state)
    if (rankA !== rankB) return rankA - rankB

    // ID
    return a.id.localeCompare(b.id)
  })
}

/**
 * Sorts export locations with preferred locations first, stable otherwise.
 * Returns a new array; does not mutate input.
 */
export function sortExportLocations(locations: ShareExportLocation[]): ShareExportLocation[] {
  return [...locations]
    .map((location, index) => ({ location, index }))
    .sort((a, b) => {
      // Preferred first
      const aPreferred = a.location.preferred === true
      const bPreferred = b.location.preferred === true
      if (aPreferred !== bPreferred) {
        return aPreferred ? -1 : 1
      }

      // Stable sort: preserve original API order within each group
      return a.index - b.index
    })
    .map(({ location }) => location)
}

/**
 * Returns a MessageDescriptor for the given replica state.
 * Returns undefined for unknown or missing states.
 */
export function getReplicaStateLabel(state: string | null | undefined): MessageDescriptor | undefined {
  if (!state) return undefined

  const normalized = state.toLowerCase().trim()

  switch (normalized) {
    case "active":
      return msg`Active`
    case "in_sync":
      return msg`In Sync`
    case "out_of_sync":
      return msg`Out of Sync`
    case "error":
      return msg`Error`
    default:
      return undefined
  }
}

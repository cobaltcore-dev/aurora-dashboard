import type { Share } from "@/server/SharedFileSystem/types/share"
import {
  SHARE_STATUS_VALUES,
  SHARE_PROTOCOL_VALUES,
  SHARE_FILTER_OTHER,
  type ShareStatusFilter,
  type ShareProtocolFilter,
  type ShareVisibilityFilter,
  type ShareSortKey,
} from "./shareListFilters"

// E3 transitional statuses (documented + backup_* pattern)
const TRANSITIONAL_STATUSES = [
  "creating",
  "creating_from_snapshot",
  "deleting",
  "extending",
  "shrinking",
  "migrating",
  "migrating_to",
  "reverting",
  "manage_starting",
  "unmanage_starting",
  "replication_change",
  "backup_creating",
  "backup_restoring",
]

/**
 * Returns the status rank for attention-first sorting (spec E3).
 * Lower rank = higher priority (error first).
 * @returns 0 = error, 1 = transitional, 2 = inactive/awaiting, 3 = available, 4 = unknown/missing
 */
export function getShareStatusRank(status: string | null | undefined): number {
  if (!status) return 4

  const normalized = status.toLowerCase().trim()

  // Error group
  if (normalized === "error" || normalized === "error_deleting" || normalized.endsWith("_error")) {
    return 0
  }

  // Transitional group (includes backup_* pattern)
  if (TRANSITIONAL_STATUSES.some((s) => s === normalized) || normalized.startsWith("backup_")) {
    return 1
  }

  // Inactive / awaiting transfer
  if (normalized === "inactive" || normalized === "awaiting_transfer") {
    return 2
  }

  // Available
  if (normalized === "available") {
    return 3
  }

  // Unknown
  return 4
}

/**
 * Returns the share type label, preferring share_type_name, falling back to share_type UUID.
 */
export function getShareTypeLabel(share: Share): string | undefined {
  return share.share_type_name?.trim() || share.share_type?.trim() || undefined
}

/**
 * Returns the display name for a share, falling back to its ID.
 */
export function getShareDisplayName(share: Share): string {
  return share.name?.trim() || share.id
}

/**
 * Parses a Manila timestamp, adding "Z" if no timezone is present.
 * @returns Date object or undefined for unparsable/missing values
 */
export function parseManilaTimestamp(value: string | null | undefined): Date | undefined {
  if (!value || !value.trim()) return undefined

  let normalized = value.trim()

  // Add "Z" if no timezone offset is present
  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized = normalized + "Z"
  }

  const parsed = new Date(normalized)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

export interface ShareListFilters {
  status?: ShareStatusFilter
  protocol?: ShareProtocolFilter
  shareType?: string
  availabilityZone?: string
  visibility?: ShareVisibilityFilter
}

/**
 * Returns true if the share matches the search term (name or ID substring).
 */
export function matchesShareSearch(share: Share, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase()
  if (!normalizedTerm) return true

  const id = share.id.toLowerCase()
  const name = share.name?.toLowerCase() || ""

  return id.includes(normalizedTerm) || name.includes(normalizedTerm)
}

/**
 * Filters shares by search term and filter facets.
 */
export function filterShares(shares: Share[], searchTerm: string, filters: ShareListFilters): Share[] {
  return shares.filter((share) => {
    // Search
    if (!matchesShareSearch(share, searchTerm)) return false

    // Status filter
    if (filters.status) {
      const normalized = share.status?.toLowerCase()
      if (filters.status === SHARE_FILTER_OTHER) {
        // "other" matches missing or unknown statuses
        if (normalized && SHARE_STATUS_VALUES.some((s) => s === normalized)) {
          return false
        }
      } else {
        if (normalized !== filters.status.toLowerCase()) return false
      }
    }

    // Protocol filter
    if (filters.protocol) {
      const normalized = share.share_proto?.toLowerCase()
      if (filters.protocol === SHARE_FILTER_OTHER) {
        // "other" matches missing or unknown protocols
        if (normalized && SHARE_PROTOCOL_VALUES.some((p) => p === normalized)) {
          return false
        }
      } else {
        if (normalized !== filters.protocol.toLowerCase()) return false
      }
    }

    // Share Type filter
    if (filters.shareType) {
      const shareTypeLabel = getShareTypeLabel(share)
      if (shareTypeLabel !== filters.shareType) return false
    }

    // Availability Zone filter
    if (filters.availabilityZone) {
      if (share.availability_zone !== filters.availabilityZone) return false
    }

    // Visibility filter
    if (filters.visibility) {
      if (filters.visibility === "public" && share.is_public !== true) return false
      if (filters.visibility === "private" && share.is_public !== false) return false
    }

    return true
  })
}

/**
 * Sorts shares by the given key and direction.
 * @returns A new sorted array
 */
export function sortShares(shares: Share[], sortBy: ShareSortKey, sortDirection: "asc" | "desc"): Share[] {
  const dir = sortDirection === "desc" ? -1 : 1
  const sorted = [...shares]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name": {
        const nameA = getShareDisplayName(a)
        const nameB = getShareDisplayName(b)
        comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
        break
      }

      case "status": {
        const rankA = getShareStatusRank(a.status)
        const rankB = getShareStatusRank(b.status)
        comparison = dir * (rankA - rankB)
        // Early return to preserve the direction flip
        if (comparison !== 0) return comparison
        // Tie-break below
        break
      }

      case "size": {
        const sizeA = a.size
        const sizeB = b.size
        // Missing sizes always sort last (regardless of direction)
        if (sizeA == null && sizeB == null) {
          comparison = 0
        } else if (sizeA == null) {
          return 1 // a goes to the end
        } else if (sizeB == null) {
          return -1 // b goes to the end
        } else {
          comparison = sizeA - sizeB
        }
        break
      }

      case "created_at": {
        const dateA = parseManilaTimestamp(a.created_at)?.getTime()
        const dateB = parseManilaTimestamp(b.created_at)?.getTime()
        // Missing/unparsable dates always sort last (regardless of direction)
        if (dateA == null && dateB == null) {
          comparison = 0
        } else if (dateA == null) {
          return 1 // a goes to the end
        } else if (dateB == null) {
          return -1 // b goes to the end
        } else {
          comparison = dateA - dateB
        }
        break
      }
    }

    // Tie-break: compare display names, then IDs
    if (comparison === 0) {
      const nameA = getShareDisplayName(a)
      const nameB = getShareDisplayName(b)
      comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
    }
    if (comparison === 0) {
      comparison = a.id.localeCompare(b.id)
    }

    return sortBy === "status" ? comparison : dir * comparison
  })

  return sorted
}

/**
 * Returns distinct, sorted values from an array, dropping empty strings.
 */
export function getDistinctValues(values: Array<string | null | undefined>): string[] {
  const distinct = new Set<string>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) distinct.add(trimmed)
  }
  return Array.from(distinct).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

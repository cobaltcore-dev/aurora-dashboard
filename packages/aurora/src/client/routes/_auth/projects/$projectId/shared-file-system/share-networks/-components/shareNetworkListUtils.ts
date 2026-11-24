import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

export const SHARE_NETWORK_SORT_KEYS = ["name", "subnet_count", "created_at"] as const
export type ShareNetworkSortKey = (typeof SHARE_NETWORK_SORT_KEYS)[number]

/**
 * Returns the display name for a share network, falling back to its ID.
 */
export function getShareNetworkDisplayName(shareNetwork: ShareNetwork): string {
  return shareNetwork.name?.trim() || shareNetwork.id
}

/**
 * Returns the subnet count, or undefined if the array is missing or not an array.
 */
export function getSubnetCount(shareNetwork: ShareNetwork): number | undefined {
  return Array.isArray(shareNetwork.share_network_subnets) ? shareNetwork.share_network_subnets.length : undefined
}

/**
 * Returns true if the share network matches the search term (name or ID substring).
 */
export function matchesShareNetworkSearch(shareNetwork: ShareNetwork, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase()
  if (!normalizedTerm) return true

  const id = shareNetwork.id.toLowerCase()
  const name = shareNetwork.name?.toLowerCase() || ""

  return id.includes(normalizedTerm) || name.includes(normalizedTerm)
}

/**
 * Filters share networks by search term.
 */
export function filterShareNetworks(shareNetworks: ShareNetwork[], searchTerm: string): ShareNetwork[] {
  return shareNetworks.filter((network) => matchesShareNetworkSearch(network, searchTerm))
}

/**
 * Sorts share networks by the given key and direction.
 * @returns A new sorted array
 */
export function sortShareNetworks(
  shareNetworks: ShareNetwork[],
  sortBy: ShareNetworkSortKey,
  sortDirection: "asc" | "desc"
): ShareNetwork[] {
  const dir = sortDirection === "desc" ? -1 : 1
  const sorted = [...shareNetworks]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name": {
        const nameA = getShareNetworkDisplayName(a)
        const nameB = getShareNetworkDisplayName(b)
        comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
        break
      }

      case "subnet_count": {
        const countA = getSubnetCount(a)
        const countB = getSubnetCount(b)
        // Missing counts always sort last (regardless of direction)
        if (countA == null && countB == null) {
          comparison = 0
        } else if (countA == null) {
          return 1 // a goes to the end
        } else if (countB == null) {
          return -1 // b goes to the end
        } else {
          comparison = countA - countB
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
      const nameA = getShareNetworkDisplayName(a)
      const nameB = getShareNetworkDisplayName(b)
      comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
    }
    if (comparison === 0) {
      comparison = a.id.localeCompare(b.id)
    }

    return dir * comparison
  })

  return sorted
}

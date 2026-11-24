import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { parseManilaTimestamp } from "./shareListUtils"

export const SECURITY_SERVICE_FILTER_OTHER = "other"

export const SECURITY_SERVICE_TYPE_VALUES = ["ldap", "kerberos", "active_directory"] as const

export const SECURITY_SERVICE_TYPE_FILTER_VALUES = [
  ...SECURITY_SERVICE_TYPE_VALUES,
  SECURITY_SERVICE_FILTER_OTHER,
] as const

export const SECURITY_SERVICE_SORT_KEYS = ["name", "type", "created_at"] as const

export type SecurityServiceTypeFilter = (typeof SECURITY_SERVICE_TYPE_FILTER_VALUES)[number]
export type SecurityServiceSortKey = (typeof SECURITY_SERVICE_SORT_KEYS)[number]

export const SECURITY_SERVICE_TYPE_LABELS: Record<(typeof SECURITY_SERVICE_TYPE_VALUES)[number], string> = {
  ldap: "LDAP",
  kerberos: "Kerberos",
  active_directory: "Active Directory",
}

/**
 * Returns the type label for a security service.
 * @returns The human-readable label for known types, the trimmed raw value for unknown types, undefined for empty/null
 */
export function getSecurityServiceTypeLabel(type: string | null | undefined): string | undefined {
  if (!type) return undefined

  const trimmed = type.trim()
  if (!trimmed) return undefined

  const normalized = trimmed.toLowerCase() as keyof typeof SECURITY_SERVICE_TYPE_LABELS
  return SECURITY_SERVICE_TYPE_LABELS[normalized] ?? trimmed
}

/**
 * Returns the display name for a security service, falling back to its ID.
 */
export function getSecurityServiceDisplayName(service: Pick<SecurityService, "id" | "name">): string {
  return service.name?.trim() || service.id
}

/**
 * Checks if a security service matches the search term.
 * @param service - The security service to check
 * @param searchTerm - The search term (matches by name or ID, case-insensitive)
 * @returns true if the service matches, false otherwise
 */
export function matchesSecurityServiceSearch(service: SecurityService, searchTerm: string): boolean {
  const term = searchTerm.trim()
  if (!term) return true

  const lowerTerm = term.toLowerCase()
  const name = service.name?.toLowerCase() ?? ""
  const id = service.id.toLowerCase()

  return name.includes(lowerTerm) || id.includes(lowerTerm)
}

/**
 * Filters security services by search term and type filter.
 * @param services - The security services to filter
 * @param searchTerm - The search term (matches by name or ID)
 * @param filters - The active filters
 * @returns A new filtered array
 */
export function filterSecurityServices(
  services: SecurityService[],
  searchTerm: string,
  filters: { type?: SecurityServiceTypeFilter }
): SecurityService[] {
  let filtered = services.filter((service) => matchesSecurityServiceSearch(service, searchTerm))

  if (filters.type) {
    filtered = filtered.filter((service) => {
      const normalizedType = service.type?.trim().toLowerCase()

      if (filters.type === SECURITY_SERVICE_FILTER_OTHER) {
        // "other" includes missing types and types not in the known list
        return (
          !normalizedType ||
          !SECURITY_SERVICE_TYPE_VALUES.includes(normalizedType as (typeof SECURITY_SERVICE_TYPE_VALUES)[number])
        )
      }

      return normalizedType === filters.type
    })
  }

  return filtered
}

/**
 * Sorts security services by the specified key and direction.
 * @param services - The security services to sort
 * @param sortBy - The field to sort by
 * @param sortDirection - The sort direction
 * @returns A new sorted array
 */
export function sortSecurityServices(
  services: SecurityService[],
  sortBy: SecurityServiceSortKey = "name",
  sortDirection: "asc" | "desc" = "asc"
): SecurityService[] {
  const sorted = [...services]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name": {
        const nameA = getSecurityServiceDisplayName(a)
        const nameB = getSecurityServiceDisplayName(b)
        comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
        if (comparison === 0) {
          comparison = a.id.localeCompare(b.id)
        }
        break
      }

      case "type": {
        const labelA = getSecurityServiceTypeLabel(a.type)
        const labelB = getSecurityServiceTypeLabel(b.type)

        // Missing labels always sort last
        if (!labelA && !labelB) comparison = 0
        else if (!labelA) return 1
        else if (!labelB) return -1
        else {
          comparison = labelA.localeCompare(labelB, undefined, {
            numeric: true,
            sensitivity: "base",
          })
          if (comparison === 0) {
            const nameA = getSecurityServiceDisplayName(a)
            const nameB = getSecurityServiceDisplayName(b)
            comparison = nameA.localeCompare(nameB, undefined, {
              numeric: true,
              sensitivity: "base",
            })
            if (comparison === 0) {
              comparison = a.id.localeCompare(b.id)
            }
          }
        }
        break
      }

      case "created_at": {
        const dateA = parseManilaTimestamp(a.created_at)?.getTime()
        const dateB = parseManilaTimestamp(b.created_at)?.getTime()

        // Missing or unparsable dates always sort last
        if (dateA == null && dateB == null) comparison = 0
        else if (dateA == null) return 1
        else if (dateB == null) return -1
        else {
          comparison = dateA - dateB
          if (comparison === 0) {
            const nameA = getSecurityServiceDisplayName(a)
            const nameB = getSecurityServiceDisplayName(b)
            comparison = nameA.localeCompare(nameB, undefined, {
              numeric: true,
              sensitivity: "base",
            })
            if (comparison === 0) {
              comparison = a.id.localeCompare(b.id)
            }
          }
        }
        break
      }
    }

    return comparison * (sortDirection === "asc" ? 1 : -1)
  })

  return sorted
}

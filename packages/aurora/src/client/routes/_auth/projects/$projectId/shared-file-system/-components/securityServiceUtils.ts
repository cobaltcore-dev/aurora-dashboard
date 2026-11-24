import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"

// #1491's Security Services tab will reuse this file
const SECURITY_SERVICE_TYPE_LABELS: Record<"ldap" | "kerberos" | "active_directory", string> = {
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
 * Sorts security services by display name, then ID.
 * @returns A new sorted array
 */
export function sortSecurityServices(services: SecurityService[]): SecurityService[] {
  const sorted = [...services]

  sorted.sort((a, b) => {
    const nameA = getSecurityServiceDisplayName(a)
    const nameB = getSecurityServiceDisplayName(b)
    const comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
    if (comparison !== 0) return comparison
    return a.id.localeCompare(b.id)
  })

  return sorted
}

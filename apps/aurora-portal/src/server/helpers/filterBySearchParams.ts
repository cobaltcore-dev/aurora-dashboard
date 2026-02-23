import type { SecurityGroup } from "../Network/types/securityGroup"

type SearchableField = "name" | "description" | "id"

/**
 * Filters security groups by search term.
 * Searches across name, description, and id fields (case-insensitive).
 *
 * @param securityGroups - Array of security groups to filter
 * @param searchTerm - Search term to match against name, description, or id
 * @param searchFields - Optional array of fields to search within (defaults to name, description, and id)
 * @returns Filtered array of security groups that match the search term
 */
export function filterBySearchParams(
  securityGroups: SecurityGroup[],
  searchTerm: string | undefined,
  searchFields: SearchableField[] = ["name", "description", "id"]
): SecurityGroup[] {
  // Return all if no search term provided
  if (!searchTerm || !searchTerm.trim()) {
    return securityGroups
  }

  const searchLower = searchTerm.toLowerCase().trim()

  return securityGroups.filter((sg) => {
    const res = searchFields.map((field) => sg?.[field]?.toLowerCase().includes(searchLower)).filter(Boolean)
    return res.length > 0
  })
}

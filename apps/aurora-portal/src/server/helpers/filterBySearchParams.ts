/**
 * Filters security groups by search term.
 * Searches across name, description, and id fields (case-insensitive).
 *
 * @param securityGroups - Array of security groups to filter
 * @param searchTerm - Search term to match against name, description, or id
 * @param searchFields - Optional array of fields to search within (defaults to name, description, and id)
 * @returns Filtered array of security groups that match the search term
 */
export function filterBySearchParams<T extends Record<string, unknown>>(
  securityGroups: T[],
  searchTerm: string | undefined,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm || !searchTerm.trim()) {
    return securityGroups
  }

  const searchLower = searchTerm.toLowerCase().trim()

  return securityGroups.filter((item) =>
    searchFields.some((field) => {
      const value = item[field]
      return typeof value === "string" && value.toLowerCase().includes(searchLower)
    })
  )
}

/**
 * Filters an array of objects by a search term across specified fields.
 * Searches are case-insensitive and match substrings.
 *
 * @param items - Array of objects to filter
 * @param searchTerm - Search term to match against specified fields
 * @param searchFields - Fields to search within
 * @returns Filtered array of items that match the search term in any of the specified fields
 *
 * @example
 * filterBySearchParams(securityGroups, "web", ["name", "description", "id"])
 * filterBySearchParams(images, "ubuntu", ["name"])
 * filterBySearchParams(users, "john", ["name", "email"])
 */
export function filterBySearchParams<T extends Record<string, unknown>>(
  items: T[],
  searchTerm: string | undefined,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm || !searchTerm.trim()) {
    return items
  }

  const searchLower = searchTerm.toLowerCase().trim()

  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field]
      return typeof value === "string" && value.toLowerCase().includes(searchLower)
    })
  )
}

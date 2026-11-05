import { useQuery } from "@tanstack/react-query"

interface Page<T> {
  total: number
  items: T[]
}

/**
 * Fetch every page of a Key Manager list so the client can filter by name OR id.
 *
 * Barbican's container list has no server-side name filter at all, and its secret list filters
 * by name only — neither can match an id. To offer "search by name or id" (as the old elektra
 * plugin did) we pull the whole list into the browser and filter there. Barbican caps a page at
 * 100 items, so we loop until everything is collected. Only runs while `enabled` (a search is
 * active), so normal browsing keeps using cheap server-side pagination.
 */
export function useAllKeyManagerPages<T>(
  queryKey: unknown[],
  fetchPage: (offset: number, limit: number) => Promise<Page<T>>,
  enabled: boolean
) {
  return useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const limit = 100
      const all: T[] = []
      let offset = 0
      for (;;) {
        const { total, items } = await fetchPage(offset, limit)
        all.push(...items)
        if (items.length === 0 || all.length >= total) break
        offset += items.length
      }
      return all
    },
  })
}

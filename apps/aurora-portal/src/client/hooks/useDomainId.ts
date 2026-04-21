import { useParams } from "@tanstack/react-router"

/**
 * Extract domainId (accountId) from the current URL.
 *
 * This hook must be used within a domain-scoped route.
 * Currently: /accounts/:accountId/...
 * Future: /domains/:domainId/...
 *
 * Note: In the current routing structure, accountId === domainId
 *
 * @throws {Error} If used outside of a domain route context
 * @returns {string} The current domain ID (account ID) from URL params
 *
 * @example
 * ```tsx
 * function UsersList() {
 *   const domainId = useDomainId()
 *
 *   const { data } = trpc.identity.users.list.useQuery({
 *     domain_id: domainId
 *   })
 * }
 * ```
 */
export function useDomainId(): string {
  // Extract from current route structure
  // This will be updated in one place when routes are restructured
  // Using strict: false to allow usage from any child route
  const { accountId } = useParams({ strict: false })

  // Runtime validation - should never happen due to TanStack Router's type safety,
  // but provides clear error message if route configuration is incorrect
  if (!accountId) {
    throw new Error(
      "useDomainId() must be used within a domain-scoped route. " +
        "This is likely a routing configuration error. " +
        "Expected route pattern: /accounts/:accountId/..."
    )
  }

  // In current structure, accountId is used as domainId
  return accountId
}

import { useAuth } from "@/client/store/AuthProvider"

/**
 * Get the current user's domain ID from the authentication context.
 *
 * This hook provides access to the domain ID of the currently authenticated user.
 * The domain ID is obtained from the user's session, not from URL parameters.
 *
 * @throws {Error} If user is not authenticated or domain ID is not available
 * @returns {string} The current domain ID from the user's session
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
  const { user } = useAuth()

  const domainId = user?.domain?.id

  if (!domainId) {
    throw new Error(
      "useDomainId() requires an authenticated user with a domain. " +
        "This is likely an authentication error. " +
        "Ensure the user is logged in and has a domain assigned."
    )
  }

  return domainId
}

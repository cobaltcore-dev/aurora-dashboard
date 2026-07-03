import { useEffect } from "react"
import { trpcReact } from "../trpcClient"
import { useAuth } from "../store/AuthProvider"

/**
 * Monitors the session expiration using TanStack Query's built-in features.
 *
 * Features:
 * - Auto-refetches session every 2 minutes to pick up rescopes from other tabs
 * - Refetches on window focus (cross-tab sync)
 * - Uses server as source of truth for expiration
 * - Checks if token expired and triggers logout
 */
export function useSessionMonitor() {
  const { isAuthenticated, login, logout, expiresAt } = useAuth()

  // Poll session status with TanStack Query
  const { data: session } = trpcReact.auth.getCurrentUserSession.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000, // Consider fresh for 1 minute
    refetchInterval: 120_000, // Auto-refetch every 2 minutes
    refetchOnWindowFocus: true, // Refetch when user switches back to tab
    refetchOnReconnect: true, // Refetch when network reconnects
    retry: false, // Don't retry on 401 (already logged out)
  })

  // Sync session state with query result
  useEffect(() => {
    if (!isAuthenticated || !session) return

    if (session.expires_at) {
      const newExpiry = new Date(session.expires_at)

      // Check if token already expired
      if (newExpiry.getTime() <= Date.now()) {
        logout("expired")
        return
      }

      // Update expiry if it changed (e.g., from rescope in another tab)
      if (newExpiry.getTime() !== expiresAt?.getTime()) {
        login(session.user, session.expires_at)
      }
    }
  }, [session, isAuthenticated, expiresAt, login, logout])

  // Check expiration on an interval (final safety net)
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return

    const checkExpiration = () => {
      if (expiresAt.getTime() <= Date.now()) {
        logout("expired")
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkExpiration, 30_000)

    // Also check immediately
    checkExpiration()

    return () => clearInterval(interval)
  }, [isAuthenticated, expiresAt, logout])
}

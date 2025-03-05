import { useEffect } from "react"
import { useAuroraStore } from "../store"

export function useAuthSync() {
  const user = useAuroraStore((state) => state.auth.user)
  const isAuthenticated = useAuroraStore((state) => state.auth.isAuthenticated)
  const syncAuthStatus = useAuroraStore((state) => state.auth.syncAuthStatus)
  const sessionExpiresAt = useAuroraStore((state) => state.auth.sessionExpiresAt)
  const logout = useAuroraStore((state) => state.auth.logout)

  // Sync authentication status only if user is not available
  useEffect(() => {
    if (!user) {
      syncAuthStatus()
    }
  }, [user, syncAuthStatus])

  // Auto-logout when session expires
  useEffect(() => {
    if (!sessionExpiresAt) return

    const expirationTime = new Date(sessionExpiresAt).getTime()

    const delay = expirationTime - Date.now()

    if (delay <= 0) {
      logout()
      return
    }

    const timeout = setTimeout(logout, delay)

    return () => clearTimeout(timeout)
  }, [sessionExpiresAt, logout])

  return {
    user,
    isAuthenticated,
    sessionExpiresAt,
  }
}

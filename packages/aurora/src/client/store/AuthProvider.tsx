import React, { useCallback, useState, useEffect } from "react"
import { TokenData } from "../../server/Authentication/types/models"
import { trpcClient } from "../trpcClient"

export type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: () => Promise<void>
  user: User
  expiresAt?: Date
}

interface RouterNavigation {
  navigate: (options: { to: string; search?: Record<string, unknown> }) => void
  invalidate: () => void
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children, router }: { children: React.ReactNode; router: RouterNavigation }) {
  const [user, setUser] = useState<User | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)

  const isAuthenticated = !!user

  const logout = useCallback(async () => {
    // Terminate the session on the server to delete the cookie
    // This ensures expired sessions are truly expired (no stale cookie)
    try {
      await trpcClient.auth.terminateUserSession.mutate()
    } catch (error) {
      // UNAUTHORIZED is expected when the token is already expired
      // Only log unexpected errors
      const isExpectedUnauthorized =
        error && typeof error === "object" && "data" in error
          ? (error.data as { code?: string } | undefined)?.code === "UNAUTHORIZED"
          : false
      if (!isExpectedUnauthorized) {
        console.error("Error terminating session:", error)
      }
    }

    setUser(null)
    setExpiresAt(undefined)

    // Navigate to login with redirect param to return user to current page after re-authentication
    const currentPath = window.location.pathname + window.location.search
    const shouldRedirect = currentPath && currentPath.startsWith("/")

    router.invalidate()

    try {
      router.navigate({
        to: "/",
        search: shouldRedirect ? { redirect: currentPath } : undefined,
      })
    } catch {
      // Fallback if router not ready
      const redirect = shouldRedirect ? `?redirect=${encodeURIComponent(currentPath)}` : ""
      window.location.href = `/${redirect}`
    }
  }, [router])

  // Timer-based expiration check (fallback/safety net)
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return

    // Check immediately if already expired
    if (expiresAt.getTime() <= Date.now()) {
      logout()
      return
    }

    // Set timeout to logout at exact expiration time
    const timeUntilExpiration = expiresAt.getTime() - Date.now()
    const timeout = setTimeout(() => {
      logout()
    }, timeUntilExpiration)

    return () => clearTimeout(timeout)
  }, [isAuthenticated, expiresAt, logout])

  const login = useCallback(async (user: User, expires_at?: string) => {
    setUser(user)

    if (expires_at) {
      const expiration = new Date(expires_at)
      setExpiresAt(expiration)
    } else {
      setExpiresAt(undefined)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        expiresAt,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

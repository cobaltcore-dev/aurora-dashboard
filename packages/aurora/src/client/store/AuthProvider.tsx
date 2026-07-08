import React, { useEffect, useRef, useCallback } from "react"
import { TokenData } from "../../server/Authentication/types/models"

export type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: (reason?: "inactive" | "expired" | "manual") => Promise<void>
  user: User
  expiresAt?: Date
  logoutReason?: "inactive" | "expired" | "manual"
}

interface RouterNavigation {
  navigate: (options: { to: string; search?: Record<string, unknown> }) => void
  invalidate: () => void
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children, router }: { children: React.ReactNode; router: RouterNavigation }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)
  const [logoutReason, setLogoutReason] = React.useState<"inactive" | "expired" | "manual" | undefined>(undefined)

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthenticated = !!user

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  const logout = useCallback(
    async (reason: "inactive" | "expired" | "manual" = "manual") => {
      clearLogoutTimer()

      setUser(null)
      setExpiresAt(undefined)
      setLogoutReason(reason)

      // Navigate to login page with redirect (only if not already on login page)
      const currentPath = window.location.pathname !== "/" ? window.location.pathname + window.location.search : null

      router.navigate({
        to: "/",
        search: currentPath ? { redirect: currentPath } : undefined,
      })

      if (reason === "manual") {
        router.invalidate()
      }
    },
    [router, clearLogoutTimer]
  )

  // Timer-based expiration check (fallback/safety net)
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return

    // Check immediately if already expired
    if (expiresAt.getTime() <= Date.now()) {
      logout("expired")
      return
    }

    // Set timeout to logout at exact expiration time
    const timeUntilExpiration = expiresAt.getTime() - Date.now()
    const timeout = setTimeout(() => {
      logout("expired")
    }, timeUntilExpiration)

    return () => clearTimeout(timeout)
  }, [isAuthenticated, expiresAt, logout])

  const login = useCallback(async (user: User, expires_at?: string) => {
    setUser(user)
    setLogoutReason(undefined)

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
        logoutReason,
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

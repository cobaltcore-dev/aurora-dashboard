import React, { useEffect, useRef, useCallback } from "react"
import { TokenData } from "../../server/Authentication/types/models"

export type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: () => Promise<void>
  user?: User
  expiresAt?: Date
}

interface RouterNavigation {
  navigate: (options: { to: string; search?: Record<string, unknown> }) => void
  invalidate: () => void
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children, router }: { children: React.ReactNode; router: RouterNavigation }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthenticated = !!user

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  const logout = useCallback(async () => {
    clearLogoutTimer()

    setUser(null)
    setExpiresAt(undefined)

    // Navigate to login page with redirect (only if not already on login page)
    const currentPath = window.location.pathname !== "/" ? window.location.pathname + window.location.search : null

    router.navigate({
      to: "/",
      search: currentPath ? { redirect: currentPath } : undefined,
    })

    router.invalidate()
  }, [router, clearLogoutTimer])

  const login = useCallback(async (user: User, expires_at?: string) => {
    setUser(user)

    if (expires_at) {
      const expiration = new Date(expires_at)
      setExpiresAt(expiration)
    } else {
      setExpiresAt(undefined)
    }
  }, [])

  useEffect(() => {
    clearLogoutTimer()

    if (user && expiresAt) {
      const timeUntilExpiry = expiresAt.getTime() - Date.now()

      if (timeUntilExpiry <= 0) {
        logout()
        return
      }

      logoutTimerRef.current = setTimeout(() => {
        logout()
      }, timeUntilExpiry)
    }

    return () => {
      clearLogoutTimer()
    }
  }, [user, expiresAt, logout, clearLogoutTimer])

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

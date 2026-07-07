import React, { useEffect, useRef, useCallback, useState } from "react"
import { TokenData } from "../../server/Authentication/types/models"

export type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: (reason?: "inactive" | "expired" | "manual") => Promise<void>
  user?: User
  expiresAt?: Date
  logoutReason?: "inactive" | "expired" | "manual"
  showInactivityModal: boolean
  closeInactivityModal: () => void
  redirectAfterModal?: string
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
  const [showInactivityModal, setShowInactivityModal] = useState(false)
  const [redirectAfterModal, setRedirectAfterModal] = useState<string | undefined>(undefined)

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthenticated = !!user

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  const closeInactivityModal = useCallback(() => {
    setShowInactivityModal(false)

    router.navigate({
      to: "/",
      search: redirectAfterModal ? { redirect: redirectAfterModal } : undefined,
    })
  }, [router, redirectAfterModal])

  const logout = useCallback(
    async (reason: "inactive" | "expired" | "manual" = "manual") => {
      clearLogoutTimer()

      setUser(null)
      setExpiresAt(undefined)
      setLogoutReason(reason)

      // For expired: Show modal instead of direct navigation
      if (reason === "expired") {
        const currentPath = window.location.pathname + window.location.search
        if (currentPath && currentPath.startsWith("/")) {
          setRedirectAfterModal(currentPath)
        }

        setShowInactivityModal(true)
      } else {
        // Manual logout: direct navigation
        router.invalidate()
      }
    },
    [router, clearLogoutTimer]
  )

  const login = useCallback(async (user: User, expires_at?: string) => {
    setUser(user)
    setLogoutReason(undefined)
    setShowInactivityModal(false)
    setRedirectAfterModal(undefined)

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
        logout("expired")
        return
      }

      logoutTimerRef.current = setTimeout(() => {
        logout("expired")
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
        logoutReason,
        showInactivityModal,
        closeInactivityModal,
        redirectAfterModal,
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

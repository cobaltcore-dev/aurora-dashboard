import React, { useCallback, useState } from "react"
import { TokenData } from "../../server/Authentication/types/models"
import { useRouter } from "@tanstack/react-router"
import { trpcClient } from "../trpcClient"

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

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)
  const [logoutReason, setLogoutReason] = React.useState<"inactive" | "expired" | "manual" | undefined>(undefined)
  const [showInactivityModal, setShowInactivityModal] = useState(false)
  const [redirectAfterModal, setRedirectAfterModal] = useState<string | undefined>(undefined)

  const isAuthenticated = !!user

  const closeInactivityModal = useCallback(() => {
    setShowInactivityModal(false)

    try {
      router.navigate({
        to: "/",
        search: redirectAfterModal ? { redirect: redirectAfterModal } : undefined,
      })
    } catch {
      // Fallback if router not ready
      window.location.href = "/"
    }
  }, [router, redirectAfterModal])

  const logout = useCallback(
    async (reason: "inactive" | "expired" | "manual" = "manual") => {
      // Terminate the session on the server to delete the cookie
      // This ensures expired sessions are truly expired (no stale cookie)
      try {
        await trpcClient.auth.terminateUserSession.mutate()
      } catch (error) {
        // Log error but continue with logout to clear local state
        console.error("Error terminating session:", error)
      }

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
        try {
          router.invalidate()
        } catch {
          // Fallback if router not ready
          window.location.href = "/"
        }
      }
    },
    [router]
  )

  // Timer-based expiration check (fallback/safety net)
  React.useEffect(() => {
    if (!isAuthenticated || !expiresAt) return

    // Check immediately if already expired
    if (expiresAt.getTime() <= Date.now()) {
      // Call logout directly with state updates to avoid closure issues
      setUser(null)
      setExpiresAt(undefined)
      setLogoutReason("expired")
      setShowInactivityModal(true)

      const currentPath = window.location.pathname + window.location.search
      if (currentPath && currentPath.startsWith("/")) {
        setRedirectAfterModal(currentPath)
      }
      return
    }

    // Set timeout to logout at exact expiration time
    const timeUntilExpiration = expiresAt.getTime() - Date.now()
    const timeout = setTimeout(() => {
      // Call logout directly with state updates to avoid closure issues
      setUser(null)
      setExpiresAt(undefined)
      setLogoutReason("expired")
      setShowInactivityModal(true)

      const currentPath = window.location.pathname + window.location.search
      if (currentPath && currentPath.startsWith("/")) {
        setRedirectAfterModal(currentPath)
      }

      // Terminate session on server (best effort)
      try {
        trpcClient.auth.terminateUserSession.mutate().catch((error) => {
          console.error("Error terminating session:", error)
        })
      } catch (error) {
        // Ignore if trpcClient not available (e.g., in tests)
        console.error("trpcClient not available:", error)
      }
    }, timeUntilExpiration)

    return () => clearTimeout(timeout)
  }, [isAuthenticated, expiresAt])

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

import React, { useEffect, useRef, useCallback } from "react"
import { TokenData } from "../../server/Authentication/types/models"
import { router } from "../router"

type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: (reason?: "inactive" | "expired" | "manual") => Promise<void>
  user?: User
  expiresAt?: Date
  logoutReason?: "inactive" | "expired" | "manual"
}

const AuthContext = React.createContext<AuthContext | null>(null)

const INACTIVITY_TIMEOUT = 30 * 1000 // 30s

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)
  const [logoutReason, setLogoutReason] = React.useState<"inactive" | "expired" | "manual" | undefined>(undefined)

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthenticated = !!user

  // Function to clear logout timer
  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }, [])

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }, [])

  const logout = useCallback(
    async (reason: "inactive" | "expired" | "manual" = "manual") => {
      clearLogoutTimer()
      clearInactivityTimer()

      if (reason === "inactive" || reason === "expired") {
        const currentPath = window.location.pathname + window.location.search + window.location.hash
        sessionStorage.setItem("redirect_after_login", currentPath)
        sessionStorage.setItem("logout_reason", reason)
      }

      setUser(null)
      setExpiresAt(undefined)
      setLogoutReason(reason)

      router.invalidate()
    },
    [clearLogoutTimer, clearInactivityTimer]
  )
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return

    clearInactivityTimer()

    inactivityTimerRef.current = setTimeout(() => {
      logout("inactive")
    }, INACTIVITY_TIMEOUT)
  }, [isAuthenticated, clearInactivityTimer, logout])

  // Login function
  const login = useCallback(
    async (user: User, expires_at?: string) => {
      setUser(user)
      setLogoutReason(undefined)

      // Set expiration if provided
      if (expires_at) {
        const expiration = new Date(expires_at)
        setExpiresAt(expiration)
      } else {
        setExpiresAt(undefined)
      }

      // Start inactivity timer after login
      resetInactivityTimer()
    },
    [resetInactivityTimer]
  )

  // Effect to handle session expiration based on token
  useEffect(() => {
    clearLogoutTimer()

    if (user && expiresAt) {
      const timeUntilExpiry = expiresAt.getTime() - Date.now()

      if (timeUntilExpiry <= 0) {
        logout("expired")
        return
      }

      // Set timer for automatic logout when token expires
      logoutTimerRef.current = setTimeout(() => {
        logout("expired")
      }, timeUntilExpiry)
    }

    return () => {
      clearLogoutTimer()
    }
  }, [user, expiresAt, logout, clearLogoutTimer])

  // Effect to setup inactivity detection
  useEffect(() => {
    if (!isAuthenticated) {
      clearInactivityTimer()
      return
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Initialize inactivity timer
    resetInactivityTimer()

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      clearInactivityTimer()
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [isAuthenticated, resetInactivityTimer, clearInactivityTimer])

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

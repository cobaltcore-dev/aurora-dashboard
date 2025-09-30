import React, { useEffect, useRef } from "react"
import { TokenData } from "../../server/Authentication/types/models"
import { router } from "../router"

type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User, expires_at?: string) => Promise<void>
  logout: () => Promise<void>
  user?: User
  expiresAt?: Date
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthenticated = !!user
  // Function to clear any existing timers
  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
  }

  // Logout function
  const logout = React.useCallback(async () => {
    clearLogoutTimer()
    setUser(null)
    router.invalidate()
    setExpiresAt(undefined)
  }, [])

  // Login function with expires_at parameter from token
  const login = React.useCallback(async (user: User, expires_at?: string) => {
    setUser(user)

    // Set expiration if provided
    if (expires_at) {
      const expiration = new Date(expires_at)
      setExpiresAt(expiration)
    } else {
      setExpiresAt(undefined)
    }
  }, [])

  // Effect to handle session expiration
  useEffect(() => {
    clearLogoutTimer()

    if (user && expiresAt) {
      const timeUntilExpiry = expiresAt.getTime() - Date.now()

      if (timeUntilExpiry <= 0) {
        logout()
        return
      }

      // Set timer for automatic logout
      logoutTimerRef.current = setTimeout(() => {
        logout()
      }, timeUntilExpiry)
    }

    // Cleanup on unmount
    return () => {
      clearLogoutTimer()
    }
  }, [user, expiresAt, logout])

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

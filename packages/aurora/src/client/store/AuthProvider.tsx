import React, { useEffect, useCallback, useState } from "react"
import { TokenData } from "../../server/Authentication/types/models"
import { trpcClient } from "../trpcClient"

export type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: { domain: string; user: string; password: string }) => Promise<{ success: boolean }>
  logout: () => Promise<void>
  user?: User
  expiresAt?: Date
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Get current session on mount
  useEffect(() => {
    trpcClient.auth.getCurrentUserSession
      .query()
      .then((session) => {
        if (session !== null) {
          setUser(session.user)
          setExpiresAt(session.expires_at)
        }
      })
      .catch((err) => {
        if (err instanceof Error) setError(err.message)
        else setError("Could not load current user session")
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Auto-logout when session expires
  useEffect(() => {
    if (!user || !expiresAt) return

    const timeUntilExpiry = new Date(expiresAt).getTime() - Date.now()
    if (timeUntilExpiry <= 0) {
      // Session already expired
      if (window.location.pathname !== "/") {
        sessionStorage.setItem("redirect_after_login", window.location.pathname + window.location.search)
        window.location.href = "/"
      }
      setUser(null)
      setExpiresAt(null)
      return
    }

    const timer = setTimeout(() => {
      // Save current location for redirect after re-login
      if (window.location.pathname !== "/") {
        sessionStorage.setItem("redirect_after_login", window.location.pathname + window.location.search)
        window.location.href = "/"
      }
      setUser(null)
      setExpiresAt(null)
    }, timeUntilExpiry)

    return () => clearTimeout(timer)
  }, [user, expiresAt])

  const logout = useCallback(async () => {
    setIsLoading(true)
    await trpcClient.auth.terminateUserSession.mutate().catch(() => {})
    setUser(null)
    setExpiresAt(null)
    setIsLoading(false)
  }, [])

  const login = useCallback(async ({ domain, user, password }: { domain: string; user: string; password: string }) => {
    setError(null)
    setIsLoading(true)
    try {
      const session = await trpcClient.auth.createUserSession.mutate({ domainName: domain, user, password })
      setUser(session.user)
      setExpiresAt(session.expires_at)
      return { success: true }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError(`Could not create session: ${err}`)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        expiresAt: expiresAt === null ? undefined : new Date(expiresAt),
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

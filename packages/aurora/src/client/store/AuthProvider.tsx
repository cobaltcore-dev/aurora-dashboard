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
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null)

  // get current session
  useEffect(() => {
    setError(null)
    setIsLoading(true)

    trpcClient.auth.getCurrentUserSession
      .query()
      .then((session) => {
        if (session !== null) {
          setUser(session.user)
          setExpiresAt(session.expires_at)
        } else {
          setUser(null)
          setExpiresAt(null)
        }
      })
      .catch((error) => {
        if (error instanceof Error) setError(error.message)
        else setError("Could not load current user session")
      })
      .finally(() => setIsLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await trpcClient.auth.terminateUserSession.mutate().catch()
    setUser(null)
    setExpiresAt(null)
  }, [])

  const login = useCallback(async ({ domain, user, password }: { domain: string; user: string; password: string }) => {
    try {
      setIsLoading(true)
      const session = await trpcClient.auth.createUserSession.mutate({ domainName: domain, user, password })
      setUser(session.user)
      setExpiresAt(session.expires_at)
      setIsLoading(false)
      return { success: true }
    } catch (error) {
      if (error instanceof Error) setError(error.message)
      else setError(`Could not create session: ${error}`)
      setIsLoading(false)
      return { success: false }
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

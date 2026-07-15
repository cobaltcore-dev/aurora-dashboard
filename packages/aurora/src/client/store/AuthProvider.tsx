import React, { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { TokenData } from "../../server/Authentication/types/models"
import { trpcReact } from "../trpcClient"

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
  const queryClient = useQueryClient()

  // Session query with React Query
  const sessionQuery = trpcReact.auth.getCurrentUserSession.useQuery(undefined, {
    staleTime: Infinity, // Session only changes via login/logout
    retry: false,
  })

  const user = sessionQuery.data?.user ?? null
  const expiresAt = sessionQuery.data?.expires_at
  const isInitialLoading = sessionQuery.isLoading
  const isRefetching = sessionQuery.isRefetching
  const error = sessionQuery.error?.message ?? null

  // Redirect to login, optionally with return URL
  const redirectToLogin = (saveReturnUrl: boolean = false) => {
    const returnUrl = saveReturnUrl
      ? `/?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : "/"

    if (window.location.pathname === "/") {
      // Already on login page - just clear cache, no redirect needed
      queryClient.clear()
    } else {
      // Redirect triggers page reload which clears cache
      window.location.href = returnUrl
    }
  }

  // Auto-logout when session expires
  useEffect(() => {
    if (!user || !expiresAt) return

    const timeUntilExpiry = new Date(expiresAt).getTime() - Date.now()

    const handleExpiry = () => {
      redirectToLogin(true)
    }

    if (timeUntilExpiry <= 0) {
      handleExpiry()
      return
    }

    const timer = setTimeout(handleExpiry, timeUntilExpiry)
    return () => clearTimeout(timer)
  }, [user, expiresAt, queryClient])

  // Login mutation
  const loginMutation = trpcReact.auth.createUserSession.useMutation()

  const login = async ({ domain, user, password }: { domain: string; user: string; password: string }) => {
    try {
      await loginMutation.mutateAsync({ domainName: domain, user, password })
      await sessionQuery.refetch()
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  // Logout mutation
  const logoutMutation = trpcReact.auth.terminateUserSession.useMutation()

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Server-side termination failed, but we still clear local state
      // The server session may remain valid but user wants to logout locally
    }
    redirectToLogin(false)
  }

  // Combined loading state (initial load, during login, or refetching after login)
  const combinedLoading = isInitialLoading || loginMutation.isPending || isRefetching

  // Error from session query or login mutation
  const combinedError = error || loginMutation.error?.message || null

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: combinedLoading,
        error: combinedError,
        login,
        logout,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
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

import React from "react"
import { TokenData } from "../../server/Authentication/types/models"
type User = TokenData["user"] | null

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  user?: User // Adjust based on your specific types
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const isAuthenticated = !!user

  const logout = React.useCallback(async () => {
    setUser(null)
  }, [])

  const login = React.useCallback(async (user: User) => {
    setUser(user)
  }, [])

  return <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { trpcClient } from "../trpcClient"

interface LoginParams {
  user: string
  password: string
  domainName: string
}

interface User {
  id: string
  name: string
  domain: { id?: string; name?: string }
  password_expires_at: string
  session_expires_at: string
}

interface AuthApi {
  login: (props: LoginParams) => Promise<void>
  logout: () => Promise<void>
  error: string | null
  isLoading: boolean
  user: User | null
}

interface State {
  user: User | null
  error: string | null
  reason?: string | null
  isLoading: boolean
}

const useAuthApi = (): AuthApi => {
  const [auth, setAuth] = useState<State>({ user: null, error: null, isLoading: true })

  useEffect(() => {
    trpcClient.identity.getAuthStatus
      .query()
      .then((res) => {
        setAuth({ user: res.user, error: null, isLoading: false, reason: res.reason })
      })
      .catch((e) => setAuth({ user: null, error: e.message, isLoading: false }))
  }, [])

  const login = (props: LoginParams) => {
    setAuth({ ...auth, error: null, isLoading: true })
    return trpcClient.identity.login
      .mutate(props)
      .then((res) => {
        setAuth({ user: res.user, error: null, isLoading: false })
      })
      .catch((e) => setAuth({ user: null, error: e.message, isLoading: false }))
  }

  const logout = () => {
    setAuth({ ...auth, error: null, isLoading: true })
    return trpcClient.identity.logout
      .mutate()
      .then(() => {
        setAuth({ user: null, error: null, isLoading: false })
      })
      .catch((e) => setAuth({ user: null, error: e.message, isLoading: false }))
  }

  // Consolidate state and API logic into a single object
  return {
    login,
    logout,
    ...auth,
  }
}

// Create the context with the appropriate type
const AuthContext = createContext<AuthApi | null>(null)

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const authApi = useAuthApi()

  return <AuthContext.Provider value={authApi}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthApi => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

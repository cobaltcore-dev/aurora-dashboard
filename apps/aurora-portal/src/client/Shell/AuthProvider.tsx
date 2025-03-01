import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { trpcClient } from "../trpcClient"
import { TokenData } from "../../server/Authentication/types/models"

interface LoginParams {
  user: string
  password: string
  domainName: string
}

interface State {
  tokenData?: TokenData | null
  error?: string | null
  isLoading: boolean
}
export interface Domain {
  id?: string
  name?: string
}

export interface AuthApi {
  login: (props: LoginParams) => Promise<void>
  logout: () => Promise<void>
  getAuthToken: () => Promise<string | null>
  isAuthenticated: boolean
  user?: TokenData["user"]
  roles?: TokenData["roles"]
  error?: string | null
  isLoading: boolean
  scopedDomain?: Domain
  scopedProject?: { id?: string; name?: string }
  session_expires_at?: TokenData["expires_at"]
}

const useAuthApi = (): AuthApi => {
  const [authData, setAuthData] = useState<State>({ isLoading: true })

  useEffect(() => {
    trpcClient.auth.token
      .query()
      .then((tokenData) => {
        setAuthData({ tokenData, error: null, isLoading: false })
      })
      .catch((e) => setAuthData({ tokenData: null, error: e.message, isLoading: false }))
  }, [])

  const login = (props: LoginParams) => {
    setAuthData({ tokenData: null, error: null, isLoading: true })
    return trpcClient.auth.login
      .mutate(props)
      .then((tokenData) => {
        setAuthData({ tokenData, error: null, isLoading: false })
      })
      .catch((e) => setAuthData({ tokenData: null, error: e.message, isLoading: false }))
  }

  const logout = () => {
    setAuthData({ ...authData, error: null, isLoading: true })
    return trpcClient.auth.logout
      .mutate()
      .then(() => {
        setAuthData({ tokenData: null, error: null, isLoading: false })
      })
      .catch((e) => setAuthData({ ...authData, error: e.message, isLoading: false }))
  }

  const getAuthToken = async () => {
    const authToken = await trpcClient.auth.authToken.query()
    return authToken
  }

  // Consolidate state and API logic into a single object
  return {
    login,
    logout,
    getAuthToken,
    session_expires_at: authData.tokenData?.expires_at,
    isLoading: authData.isLoading,
    error: authData.error,
    isAuthenticated: !!authData.tokenData,
    user: authData.tokenData?.user,
    roles: authData.tokenData?.roles,
    scopedDomain: authData.tokenData?.project?.domain || authData.tokenData?.domain,
    scopedProject: authData.tokenData?.project,
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

// AppContent.tsx
import React, { useEffect } from "react"
import { trpcClient } from "../trpcClient"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { useAuroraContext } from "./AuroraProvider"
import { AuroraRouter } from "./AuroraRouterConfig"

export function AppContent() {
  const [authLoading, setIsLoading] = React.useState(true)
  const { auroraRoutes } = useAuroraContext()
  const { isAuthenticated } = useAuth()
  const dispatch = useAuthDispatch()

  // sync auth status on mount
  useEffect(() => {
    trpcClient.auth.getCurrentUserSession
      .query()
      .then((token) =>
        token
          ? dispatch({ type: "LOGIN_SUCCESS", payload: { user: token?.user, sessionExpiresAt: token?.expires_at } })
          : dispatch({ type: "LOGOUT" })
      )
      .catch((error) => dispatch({ type: "LOGIN_FAILURE", payload: { error: error.message } }))
      .finally(() => setIsLoading(false))
  }, [dispatch])
  // Create router

  return (
    <div className="content">
      <AuroraRouter auroraRoutes={auroraRoutes} isAuthenticated={isAuthenticated} isLoading={authLoading} />
    </div>
  )
}

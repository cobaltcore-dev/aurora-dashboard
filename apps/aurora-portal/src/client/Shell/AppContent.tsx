// AppContent.tsx
import React, { useEffect } from "react"
import { trpcClient } from "../trpcClient"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { AuroraRouter } from "./AuroraRouter"

export function AppContent() {
  const [authLoading, setIsLoading] = React.useState(true)

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
      <AuroraRouter isAuthenticated={isAuthenticated} isLoading={authLoading} />
    </div>
  )
}

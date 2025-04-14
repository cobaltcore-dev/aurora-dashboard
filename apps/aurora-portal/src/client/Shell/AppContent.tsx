// AppContent.tsx
import React, { useEffect } from "react"
import { trpcClient } from "../trpcClient"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { routeTree } from "../routeTree.gen"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { SignIn } from "../Auth/SignIn"
// Register things for typesafety

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Set up a Router instance
const router = createRouter({
  routeTree,
  context: {
    trpcClient: undefined!,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
})

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
  if (authLoading) {
    return <span>Please wait while your session is synced...</span>
  }

  if (!isAuthenticated) {
    return <SignIn trpcClient={trpcClient.auth} />
  }

  return (
    <div className="content">
      <RouterProvider context={{ trpcClient }} router={router} />
    </div>
  )
}

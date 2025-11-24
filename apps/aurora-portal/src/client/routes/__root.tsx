import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { AppShell, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { MainNavigation } from "../components/navigation/MainNavigation"
import { TrpcClient, TrpcReact } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "../components/Error/ErrorBoundry"
import { NotFound } from "../components/Error/NotFound"
import { NavigationItem } from "../components/navigation/types"
import styles from "../index.css?inline"

interface MyRouterContext {
  trpcReact: TrpcReact
  trpcClient: TrpcClient
  auth: AuthContext
  navItems: NavigationItem[]
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
})

function RootLayout() {
  const { navItems } = Route.useRouteContext()
  const routerState = useRouterState()
  const isNavigating =
    routerState.status === "pending" && routerState.location.pathname !== routerState?.resolvedLocation?.pathname

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isNavigating) {
      setIsLoading(true)
    } else {
      setTimeout(() => setIsLoading(false), 300)
    }
  }, [isNavigating])

  return (
    <>
      <style>{styles.toString()}</style>
      <AppShell pageHeader={<MainNavigation items={navItems} />}>
        <Outlet />
        {isLoading && (
          <Stack className="fixed inset-0" distribution="center" alignment="center">
            <div className="absolute inset-0 backdrop-blur-sm" />
            <Spinner variant="primary" size="large" />
          </Stack>
        )}
      </AppShell>
    </>
  )
}

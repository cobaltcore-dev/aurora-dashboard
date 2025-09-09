import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Spinner, Stack, PageFooter } from "@cloudoperators/juno-ui-components"
// NavigationLayout.tsx
import { MainNavigation } from "../components/navigation/MainNavigation"
import { NavigationItem } from "../components/navigation/types"

import { TrpcClient } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { useEffect, useState } from "react"

interface NavigationLayoutProps {
  mainNavItems?: NavigationItem[]
}

interface MyRouterContext {
  trpcClient?: TrpcClient
  auth?: AuthContext
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: AuroraLayout,
})

function AuroraLayout({ mainNavItems = [] }: NavigationLayoutProps) {
  const routerState = useRouterState()
  const isNavigating =
    routerState.status === "pending" && routerState.location.pathname !== routerState?.resolvedLocation?.pathname

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isNavigating) {
      setIsLoading(true)
    } else {
      setTimeout(() => {
        setIsLoading(false)
      }, 300)
    }
  }, [isNavigating, isLoading, setIsLoading])

  const defaultItems: NavigationItem[] = [{ route: "/about", label: "About" }]
  const items = mainNavItems.length > 0 ? mainNavItems : defaultItems

  return (
    <div className="flex flex-col w-full min-h-screen">
      <MainNavigation items={items} />
      <div className="relative flex-1">
        <Outlet />
        {isLoading && (
          <Stack className="fixed inset-0" distribution="center" alignment="center">
            <div className="absolute inset-0 backdrop-blur-sm" />
            <Spinner variant="primary" size="large" />
          </Stack>
        )}
      </div>
      <PageFooter />
      <TanStackRouterDevtools initialIsOpen={false} position="bottom-left" />
    </div>
  )
}

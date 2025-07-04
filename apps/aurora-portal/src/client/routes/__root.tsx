import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
// NavigationLayout.tsx
import { MainNavigation } from "../components/navigation/MainNavigation"
import { NavigationItem } from "../components/navigation/types"

import { TrpcClient } from "../trpcClient"
import { AuthContext } from "../store/AuthProvider"
import { Spinner } from "../components/Spiner" // Adjust the path if necessary
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
  // More specific selector to check if we're actually navigating to a different route
  const routerState = useRouterState()
  const isNavigating =
    routerState.status === "pending" && routerState.location.pathname !== routerState?.resolvedLocation?.pathname

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only show loading spinner for actual route changes, not search parameter changes
    if (isNavigating) {
      setIsLoading(true)
    } else {
      setTimeout(() => {
        setIsLoading(false)
      }, 300) // Delay to show spinner for at least 300ms
    }
  }, [isNavigating, isLoading, setIsLoading])

  // Default navigation items
  const defaultItems: NavigationItem[] = [
    { route: "/about", label: "About" },
    { route: "/gardener", label: "Gardener" },
    { route: "/extensions", label: "Extensions" },
  ]
  const items = mainNavItems.length > 0 ? mainNavItems : defaultItems
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation items={items} />
      </div>
      {/* Show a global spinner when the router is transitioning */}

      <div className="relative flex-1">
        <Outlet />

        {/* Overlay spinner when loading */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-aurora-gray-950/80 to-aurora-gray-900/80 backdrop-blur-sm" />

            {/* Spinner container */}
            <div className="relative bg-aurora-gray-900/95 rounded-2xl p-8 shadow-2xl border border-aurora-gray-800">
              <Spinner show={isLoading} fullscreen size="lg" text="Loading..." />
            </div>
          </div>
        )}
      </div>
      <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
    </div>
  )
}

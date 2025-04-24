import * as React from "react"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
// NavigationLayout.tsx
import { MainNavigation } from "../components/navigation/MainNavigation"
import { NavigationItem } from "../components/navigation/types"

import { TrpcClient } from "../trpcClient"

interface NavigationLayoutProps {
  mainNavItems?: NavigationItem[]
}

interface MyRouterContext {
  trpcClient?: TrpcClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: AuroraLayout,
})

function AuroraLayout({ mainNavItems = [] }: NavigationLayoutProps) {
  // Default navigation items
  const defaultItems: NavigationItem[] = [{ route: "/about", label: "About X" }]
  const items = mainNavItems.length > 0 ? mainNavItems : defaultItems
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation items={items} />
      </div>

      <div>{<Outlet />}</div>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}

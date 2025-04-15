import { SubNavigation } from "./Navigation/SubNavigation"

// NavigationLayout.tsx
import React from "react"
import { Outlet } from "react-router-dom"
import { MainNavigation } from "./Navigation/MainNavigation"
import { NavigationItem } from "./Navigation/types"

interface NavigationLayoutProps {
  mainNavItems?: NavigationItem[]
  children?: React.ReactNode
}

export function AuroraLayout({ mainNavItems = [], children }: NavigationLayoutProps) {
  // Default navigation items
  const defaultItems: NavigationItem[] = [{ route: "/about", label: "About" }]

  const items = mainNavItems.length > 0 ? mainNavItems : defaultItems

  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation items={items} />
      </div>

      {/* Sub-Navigation with similar reduced height */}
      <div className="w-full flex">
        {/* Even smaller spacing */}
        <SubNavigation />
      </div>
      <div className="py-4 pl-4 bg-theme-global-bg h-full">{children || <Outlet />}</div>
    </div>
  )
}

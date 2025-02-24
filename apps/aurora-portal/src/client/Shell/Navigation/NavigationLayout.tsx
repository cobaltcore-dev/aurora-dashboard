import { MainNavigation } from "./MainNavigation"
import { SubNavigation } from "./SubNavigation"
import { NavigationItem } from "./types"
export function NavigationLayout({
  mainNavItems,
  subNavItems,
}: {
  mainNavItems: NavigationItem[]
  subNavItems: NavigationItem[]
}) {
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation items={mainNavItems} />
      </div>

      {/* Sub-Navigation with similar reduced height */}
      <div className="w-full flex">
        {/* Even smaller spacing */}
        <SubNavigation items={subNavItems} />
      </div>
    </div>
  )
}

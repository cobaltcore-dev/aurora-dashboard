import { MainNavigation } from "./MainNavigation"
import { SubNavigation } from "./SubNavigation"
import { NavigationItem } from "./types"
import { useLocation } from "wouter"
import { useAuroraContext } from "../AuroraProvider"

export function NavigationLayout({ mainNavItems }: { mainNavItems: NavigationItem[] }) {
  const [location] = useLocation()
  const { currentProject, domain } = useAuroraContext()
  const subNavItems = []

  if (location === "/") {
    subNavItems.push({ route: "/", label: "Welcome" })
  } else {
    if (currentProject) {
      subNavItems.push({ route: `/${domain?.id}/projects/${currentProject.id}/compute`, label: "Compute" })
      subNavItems.push({ route: `/${domain?.id}/projects/${currentProject.id}/network`, label: "Network" })
      subNavItems.push({ route: `/${domain?.id}/projects/${currentProject.id}/storage`, label: "Storage" })
      subNavItems.push({ route: `/${domain?.id}/projects/${currentProject.id}/metrics`, label: "Metrics" })
    } else {
      subNavItems.push({ route: `/${domain?.id}/projects`, label: "Overview" })
    }
  }
  return (
    <div className="flex flex-col w-full bg-theme-background-lvl-1">
      {/* Main Navigation with minimal height */}
      <div className="px-2 py-1">
        {/* Reduced padding */}
        <MainNavigation scopedDomain={domain} items={mainNavItems} />
      </div>

      {/* Sub-Navigation with similar reduced height */}
      <div className="w-full flex">
        {/* Even smaller spacing */}
        <SubNavigation items={subNavItems} />
      </div>
    </div>
  )
}

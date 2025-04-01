import { Link, useLocation } from "wouter"
import { AuroraContext, useAuroraContext } from "../AuroraProvider"
import { use } from "react"

export function SubNavigation() {
  const [location] = useLocation()
  const context = use(AuroraContext)
  const { auroraRoutes } = useAuroraContext()
  const projectId = context?.currentScope?.scope?.project?.id
  const domainId = context?.currentScope?.scope?.domain?.id

  const items = []
  if (location === auroraRoutes.home) {
    items.push({ route: auroraRoutes.home, label: "Wellcome" })
  } else if (location === auroraRoutes.about) {
    items.push({ route: auroraRoutes.about, label: "About" })
  } else {
    if (projectId) {
      items.push({ route: auroraRoutes.domain(domainId).project(projectId).compute.root, label: "Compute" })
      items.push({ route: auroraRoutes.domain(domainId).project(projectId).network.root, label: "Network" })
      items.push({ route: auroraRoutes.domain(domainId).project(projectId).storage.root, label: "Storage" })
      items.push({ route: auroraRoutes.domain(domainId).project(projectId).metrics.root, label: "Metrics" })
    } else {
      items.push({ route: auroraRoutes.domain(domainId).projects, label: "Overview" })
    }
  }
  return (
    <div className="flex items-center px-3 bg-gray-50 shadow-sm w-full relative">
      {items.map(({ route, label }) => (
        <Link
          key={route}
          href={route}
          className={(active) => {
            return active ? "relative px-3 py-2 transition-colors active" : "relative px-3 py-2 transition-colors"
          }}
        >
          {/* Inner container for hover effect */}
          <div className="px-3 py-2 rounded-md hover:bg-juno-grey-blue-1">
            <span className={`text-base ${location === route ? "font-semibold text-theme-accent" : "text-gray-700"}`}>
              {label}
            </span>
          </div>

          {/* Bottom border effect */}
          {location === route && <div className="absolute left-0 bottom-0 w-full h-[3px] bg-theme-accent" />}
        </Link>
      ))}
    </div>
  )
}

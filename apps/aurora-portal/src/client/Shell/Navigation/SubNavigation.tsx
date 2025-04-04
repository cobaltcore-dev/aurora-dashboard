import { useAuroraContext } from "../AuroraProvider"

import { NavLink, useLocation, useParams } from "react-router-dom"

export function SubNavigation() {
  const location = useLocation()
  const { auroraRoutes } = useAuroraContext()

  const { domain, project } = useParams()
  const items = []
  if (location.pathname === auroraRoutes.home) {
    items.push({ route: auroraRoutes.home, label: "Wellcome" })
  } else if (location.pathname === auroraRoutes.about) {
    items.push({ route: auroraRoutes.about, label: "About" })
  } else {
    if (project) {
      items.push({ route: auroraRoutes.domain(domain).project(project).compute.root, label: "Compute" })
      items.push({ route: auroraRoutes.domain(domain).project(project).network.root, label: "Network" })
      items.push({ route: auroraRoutes.domain(domain).project(project).storage.root, label: "Storage" })
      items.push({ route: auroraRoutes.domain(domain).project(project).metrics.root, label: "Metrics" })
    } else {
      items.push({ route: auroraRoutes.domain(domain).projects, label: "Overview" })
    }
  }

  return (
    <div className="flex items-center px-3 bg-gray-50 shadow-sm w-full relative">
      {items.map(({ route, label }) => (
        <NavLink
          key={route}
          to={route}
          className={(isActive) => {
            return isActive ? "relative px-3 py-2 transition-colors active" : "relative px-3 py-2 transition-colors"
          }}
        >
          {/* Inner container for hover effect */}
          <div className="px-3 py-2 rounded-md hover:bg-juno-grey-blue-1">
            <span
              className={`text-base ${location.pathname.startsWith(route) ? "font-semibold text-theme-accent" : "text-gray-700"}`}
            >
              {label}
            </span>
          </div>

          {/* Bottom border effect */}
          {location.pathname.startsWith(route) && (
            <div className="absolute left-0 bottom-0 w-full h-[3px] bg-theme-accent" />
          )}
        </NavLink>
      ))}
    </div>
  )
}

import { NavLink, useLocation, useParams } from "react-router-dom"

export function SubNavigation() {
  const location = useLocation()

  const { domain, project } = useParams()
  const items = []

  if (location.pathname === "/") {
    items.push({ route: "/", label: "Wellcome" })
  } else if (location.pathname === "/about") {
    items.push({ route: "/about", label: "About" })
  } else {
    if (project) {
      const projectBasePath = `/accounts/${domain}/projects/${project}`
      items.push({ route: `${projectBasePath}/compute`, label: "Compute" })
      items.push({ route: `${projectBasePath}/network`, label: "Network" })
      items.push({ route: `${projectBasePath}/storage`, label: "Storage" })
      items.push({ route: `${projectBasePath}/metrics`, label: "Metrics" })
    } else {
      items.push({ route: `/accounts/${domain}/projects`, label: "Overview" })
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

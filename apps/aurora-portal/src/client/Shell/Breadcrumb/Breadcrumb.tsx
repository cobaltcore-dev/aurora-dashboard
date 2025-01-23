import { Breadcrumb, BreadcrumbItem } from "@cloudoperators/juno-ui-components"
import { useLocation } from "wouter"

export function AuroraBreadcrumb() {
  const [location, setLocation] = useLocation()

  const currentLocation = location.split("/").filter((path) => path !== "")

  return (
    <Breadcrumb>
      <BreadcrumbItem
        icon="home"
        label=""
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setLocation("/")
        }}
      />
      {currentLocation.map((path, i) => (
        <BreadcrumbItem key={i} label={path} />
      ))}
    </Breadcrumb>
  )
}

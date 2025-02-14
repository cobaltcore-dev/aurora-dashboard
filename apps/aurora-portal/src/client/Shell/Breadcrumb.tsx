import { Breadcrumb as BreadcrumbComponent, BreadcrumbItem } from "@cloudoperators/juno-ui-components"
import { useLocation } from "wouter"

export function Breadcrumb() {
  const [location, setLocation] = useLocation()

  const currentLocation = location.split("/").filter((path) => path !== "")

  return (
    <BreadcrumbComponent>
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
    </BreadcrumbComponent>
  )
}

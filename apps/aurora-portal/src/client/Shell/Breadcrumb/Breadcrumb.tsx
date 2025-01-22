// @ts-expect-error missing types
import { Breadcrumb, BreadcrumbItem } from "@cloudoperators/juno-ui-components"
import { useLocation } from "wouter"

export function AuroraBreadcrumb() {
  const [location, setLocation] = useLocation()

  const currentLocation = location.split("/").filter((l) => l !== "")

  console.log(currentLocation)
  return (
    <Breadcrumb>
      <BreadcrumbItem
        icon="home"
        label=""
        onClick={(e: React.ChangeEvent<HTMLInputElement>) => {
          e.stopPropagation()
          e.preventDefault()
          setLocation("/")
        }}
      />
      {currentLocation?.length > 0 && <BreadcrumbItem label={currentLocation} />}
      {/* <BreadcrumbItem label="Breadcrumb Item" />
      <BreadcrumbItem icon="place" label="Breadcrumb Item with Icon" />
      <BreadcrumbItem disabled label="Disabled Item " />
      <BreadcrumbItem active label="Active Item" /> */}
    </Breadcrumb>
  )
}

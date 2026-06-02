export interface Crumb {
  label?: string
  to?: string
  useParamAsLabel?: string
}

export interface RouteInfo {
  section: string
  service?: string
  isDetail?: boolean
  crumb?: Crumb
  sectionCrumb?: Crumb
}

export function isRouteInfo(data: unknown): data is RouteInfo {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as RouteInfo).section === "string"
  )
}

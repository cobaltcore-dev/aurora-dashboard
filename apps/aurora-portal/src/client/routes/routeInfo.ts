export interface RouteInfo {
  section: string
  service: string | undefined
  isDetail?: boolean
}

export function isRouteInfo(data: unknown): data is RouteInfo {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as RouteInfo).section === "string" &&
    (typeof (data as RouteInfo).service === "string" || (data as RouteInfo).service === undefined) &&
    (typeof (data as RouteInfo).isDetail === "boolean" || (data as RouteInfo).isDetail === undefined)
  )
}

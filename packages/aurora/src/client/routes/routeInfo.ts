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

function isCrumb(value: unknown): value is Crumb {
  return typeof value === "object" && value !== null
}

export function isRouteInfo(data: unknown): data is RouteInfo {
  if (typeof data !== "object" || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.section !== "string") return false
  if (d.service !== undefined && typeof d.service !== "string") return false
  if (d.isDetail !== undefined && typeof d.isDetail !== "boolean") return false
  if (d.crumb !== undefined && !isCrumb(d.crumb)) return false
  if (d.sectionCrumb !== undefined && !isCrumb(d.sectionCrumb)) return false
  return true
}

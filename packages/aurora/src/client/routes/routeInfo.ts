import { z } from "zod"

export const CRUMB_LABEL_KEYS = [
  "Compute",
  "Network",
  "Storage",
  "Services",
  "Images",
  "Flavors",
  "Security Groups",
  "Floating IPs",
  "PCA (Clavis)",
] as const

export type CrumbLabelKey = (typeof CRUMB_LABEL_KEYS)[number]

/**
 * Section identifiers used in route staticData.
 */
export const ROUTE_SECTIONS = {
  COMPUTE: "compute",
  NETWORK: "network",
  STORAGE: "storage",
  SERVICES: "services",
} as const

export type RouteSection = (typeof ROUTE_SECTIONS)[keyof typeof ROUTE_SECTIONS]

/**
 * Service identifiers used in route staticData.
 * "object-store" is a marker for storage routes where the actual service (swift/ceph)
 * is determined dynamically from route params.
 */
export const ROUTE_SERVICES = {
  // Compute
  IMAGES: "images",
  FLAVORS: "flavors",
  // Network
  SECURITY_GROUPS: "securitygroups",
  FLOATING_IPS: "floatingips",
  // Storage
  OBJECT_STORE: "object-store",
  // Services
  PCA: "pca",
} as const

export type RouteService = (typeof ROUTE_SERVICES)[keyof typeof ROUTE_SERVICES]

const ROUTE_SECTIONS_VALUES = Object.values(ROUTE_SECTIONS) as [RouteSection, ...RouteSection[]]
const ROUTE_SERVICES_VALUES = Object.values(ROUTE_SERVICES) as [RouteService, ...RouteService[]]

const CrumbSchema = z.object({
  labelKey: z.enum(CRUMB_LABEL_KEYS).optional(),
  to: z.string().optional(),
  useParamAsLabel: z.string().optional(),
  useParentTitleAsLabel: z.boolean().optional(),
})

const RouteInfoSchema = z.object({
  section: z.enum(ROUTE_SECTIONS_VALUES),
  service: z.enum(ROUTE_SERVICES_VALUES).optional(),
  isDetail: z.boolean().optional(),
  crumb: CrumbSchema.optional(),
  sectionCrumb: CrumbSchema.optional(),
  intermediateCrumb: CrumbSchema.optional(),
})

export type Crumb = z.infer<typeof CrumbSchema>
export type RouteInfo = z.infer<typeof RouteInfoSchema>

export function isRouteInfo(data: unknown): data is RouteInfo {
  return RouteInfoSchema.safeParse(data).success
}

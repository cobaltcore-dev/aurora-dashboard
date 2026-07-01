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

const CrumbSchema = z.object({
  labelKey: z.enum(CRUMB_LABEL_KEYS).optional(),
  to: z.string().optional(),
  useParamAsLabel: z.string().optional(),
  useParentTitleAsLabel: z.boolean().optional(),
})

const AnalyticsSchema = z.object({
  name: z.string(),
})

const RouteInfoSchema = z.object({
  section: z.string().optional(),
  service: z.string().optional(),
  isDetail: z.boolean().optional(),
  crumb: CrumbSchema.optional(),
  sectionCrumb: CrumbSchema.optional(),
  intermediateCrumb: CrumbSchema.optional(),
  analytics: AnalyticsSchema.optional(),
})

export type Crumb = z.infer<typeof CrumbSchema>
export type Analytics = z.infer<typeof AnalyticsSchema>
export type RouteInfo = z.infer<typeof RouteInfoSchema>

export function isRouteInfo(data: unknown): data is RouteInfo {
  return RouteInfoSchema.safeParse(data).success
}

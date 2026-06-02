import { z } from "zod"

const CrumbSchema = z.object({
  label: z.string().optional(),
  to: z.string().optional(),
  useParamAsLabel: z.string().optional(),
})

const RouteInfoSchema = z.object({
  section: z.string(),
  service: z.string().optional(),
  isDetail: z.boolean().optional(),
  crumb: CrumbSchema.optional(),
  sectionCrumb: CrumbSchema.optional(),
})

export type Crumb = z.infer<typeof CrumbSchema>
export type RouteInfo = z.infer<typeof RouteInfoSchema>

export function isRouteInfo(data: unknown): data is RouteInfo {
  return RouteInfoSchema.safeParse(data).success
}

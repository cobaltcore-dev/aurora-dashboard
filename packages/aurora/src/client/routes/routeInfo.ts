import { z } from "zod"
import type { MessageDescriptor } from "@lingui/core"

const CrumbSchema = z.object({
  text: z.custom<MessageDescriptor | string>().optional(),
  to: z.string().optional(),
  icon: z.string().optional(),
})

const AnalyticsSchema = z.object({
  name: z.string(),
})

const RouteInfoSchema = z.object({
  section: z.string().optional(),
  service: z.string().optional(),
  crumb: CrumbSchema.optional(),
  analytics: AnalyticsSchema.optional(),
})

export type Crumb = z.infer<typeof CrumbSchema>
export type Analytics = z.infer<typeof AnalyticsSchema>
export type RouteInfo = z.infer<typeof RouteInfoSchema>

export function isRouteInfo(data: unknown): data is RouteInfo {
  return RouteInfoSchema.safeParse(data).success
}

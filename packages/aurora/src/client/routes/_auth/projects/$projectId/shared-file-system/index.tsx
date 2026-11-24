import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import {
  SHARE_STATUS_FILTER_VALUES,
  SHARE_PROTOCOL_FILTER_VALUES,
  SHARE_VISIBILITY_FILTER_VALUES,
  SHARE_SORT_KEYS,
} from "./-components/shareListFilters"
import { SharesList } from "./-components/SharesList"

// URL search param validation with per-field fallback (follow Networks pattern)
const sharesSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(SHARE_SORT_KEYS).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  status: z.enum(SHARE_STATUS_FILTER_VALUES).optional(),
  protocol: z.enum(SHARE_PROTOCOL_FILTER_VALUES).optional(),
  shareType: z.string().min(1).optional(),
  availabilityZone: z.string().min(1).optional(),
  visibility: z.enum(SHARE_VISIBILITY_FILTER_VALUES).optional(),
}

const sharesSearchSchema = z.looseObject(sharesSearchFields)

const validOrUndefined = <T,>(schema: z.ZodType<T>, value: unknown): T | undefined => {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

export type SharesSearchParams = z.infer<typeof sharesSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.shares.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Shares` }] }),
  validateSearch: (search) => {
    const result = sharesSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: validOrUndefined(sharesSearchFields.search, search.search),
      sortBy: validOrUndefined(sharesSearchFields.sortBy, search.sortBy),
      sortDirection: validOrUndefined(sharesSearchFields.sortDirection, search.sortDirection),
      status: validOrUndefined(sharesSearchFields.status, search.status),
      protocol: validOrUndefined(sharesSearchFields.protocol, search.protocol),
      shareType: validOrUndefined(sharesSearchFields.shareType, search.shareType),
      availabilityZone: validOrUndefined(sharesSearchFields.availabilityZone, search.availabilityZone),
      visibility: validOrUndefined(sharesSearchFields.visibility, search.visibility),
    }
  },
  component: SharesRoute,
})

function SharesRoute() {
  const { projectId } = Route.useParams()
  return <SharesList key={projectId} projectId={projectId} />
}

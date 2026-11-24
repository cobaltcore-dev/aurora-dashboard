import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { msg, t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { SHARE_NETWORK_SORT_KEYS } from "./-components/shareNetworkListUtils"
import { ShareNetworksList } from "./-components/ShareNetworksList"

// URL search param validation with per-field fallback
const shareNetworksSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(SHARE_NETWORK_SORT_KEYS).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}

const shareNetworksSearchSchema = z.looseObject(shareNetworksSearchFields)

const validOrUndefined = <T,>(schema: z.ZodType<T>, value: unknown): T | undefined => {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

export type ShareNetworksSearchParams = z.infer<typeof shareNetworksSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/share-networks/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    crumb: { text: msg`Share Networks` },
    analytics: { name: "shared-file-system.share_networks.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share Networks` }] }),
  validateSearch: (search) => {
    const result = shareNetworksSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: validOrUndefined(shareNetworksSearchFields.search, search.search),
      sortBy: validOrUndefined(shareNetworksSearchFields.sortBy, search.sortBy),
      sortDirection: validOrUndefined(shareNetworksSearchFields.sortDirection, search.sortDirection),
    }
  },
  component: ShareNetworksRoute,
})

function ShareNetworksRoute() {
  const { projectId } = Route.useParams()
  return <ShareNetworksList key={projectId} projectId={projectId} />
}

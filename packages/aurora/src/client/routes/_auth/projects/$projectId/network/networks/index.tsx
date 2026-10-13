import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { Networks } from "./-components/NetworksList"
import { NETWORK_SHARED_FILTER_VALUES, NETWORK_STATUS_FILTER_VALUES } from "./-components/networkListFilters"

const networksSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["name", "status", "mtu"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  status: z.enum(NETWORK_STATUS_FILTER_VALUES).optional(),
  shared: z.enum(NETWORK_SHARED_FILTER_VALUES).optional(),
}

const networksSearchSchema = z.looseObject(networksSearchFields)

export type NetworksSearchParams = z.infer<typeof networksSearchSchema>

const validOrUndefined = <T,>(schema: z.ZodType<T>, value: unknown): T | undefined => {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/networks/")({
  staticData: {
    section: "network",
    service: "networks",
    analytics: {
      name: "network.networks.list",
    },
  } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = networksSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: validOrUndefined(networksSearchFields.search, search.search),
      sortBy: validOrUndefined(networksSearchFields.sortBy, search.sortBy),
      sortDirection: validOrUndefined(networksSearchFields.sortDirection, search.sortDirection),
      page: validOrUndefined(networksSearchFields.page, search.page),
      status: validOrUndefined(networksSearchFields.status, search.status),
      shared: validOrUndefined(networksSearchFields.shared, search.shared),
    }
  },
  head: () => ({ meta: [{ title: t`Networks` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  return (
    <>
      <ContentHeader title={t`Networks`} projectId={projectId} />
      {/* Remount on project change, so the previous project's networks are not shown while the new list loads */}
      <Networks key={projectId} project={projectId} client={trpcClient!} />
    </>
  )
}

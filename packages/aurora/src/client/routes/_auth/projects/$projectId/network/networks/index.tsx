import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { Networks } from "./-components/NetworksList"

const networksSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["name", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
}

const networksSearchSchema = z.looseObject(networksSearchFields)

export type NetworksSearchParams = z.infer<typeof networksSearchSchema>

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
      search: networksSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: networksSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: networksSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
      page: networksSearchFields.page.safeParse(search.page).success ? (search.page as number) : undefined,
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

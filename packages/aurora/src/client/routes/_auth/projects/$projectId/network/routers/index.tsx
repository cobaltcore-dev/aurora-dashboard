import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { Routers } from "./-components/RoutersList"

const routersSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["name", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
}

const routersSearchSchema = z.looseObject(routersSearchFields)

export type RoutersSearchParams = z.infer<typeof routersSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers/")({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.list",
    },
  } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = routersSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: routersSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: routersSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: routersSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
      page: routersSearchFields.page.safeParse(search.page).success ? (search.page as number) : undefined,
    }
  },
  head: () => ({ meta: [{ title: t`Routers` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  return (
    <>
      <ContentHeader title={t`Routers`} projectId={projectId} />
      {/* Remount on project change, so the previous project's routers are not shown while the new list loads */}
      <Routers key={projectId} project={projectId} client={trpcClient!} />
    </>
  )
}

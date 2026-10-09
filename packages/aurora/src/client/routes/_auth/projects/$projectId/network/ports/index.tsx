import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { z } from "zod"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { Ports } from "./-components/PortsList"

const portsSearchFields = {
  search: z.string().optional(),
  sortBy: z.enum(["name", "status", "device_owner"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
}

const portsSearchSchema = z.looseObject(portsSearchFields)

export type PortsSearchParams = z.infer<typeof portsSearchSchema>

export const Route = createFileRoute("/_auth/projects/$projectId/network/ports/")({
  staticData: {
    section: "network",
    service: "ports",
    analytics: {
      name: "network.ports.list",
    },
  } satisfies RouteInfo,
  validateSearch: (search) => {
    const result = portsSearchSchema.safeParse(search)
    if (result.success) return result.data
    return {
      ...search,
      search: portsSearchFields.search.safeParse(search.search).success ? search.search : undefined,
      sortBy: portsSearchFields.sortBy.safeParse(search.sortBy).success ? search.sortBy : undefined,
      sortDirection: portsSearchFields.sortDirection.safeParse(search.sortDirection).success
        ? search.sortDirection
        : undefined,
      page: portsSearchFields.page.safeParse(search.page).success ? (search.page as number) : undefined,
    }
  },
  head: () => ({ meta: [{ title: t`Ports` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  return (
    <>
      <ContentHeader title={t`Ports`} projectId={projectId} />
      {/* Remount on project change, so the previous project's ports are not shown while the new list loads */}
      <Ports key={projectId} project={projectId} client={trpcClient!} />
    </>
  )
}

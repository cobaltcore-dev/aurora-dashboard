import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { NetworksList } from "./-components/NetworksList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { z } from "zod"

const networksSearchSchema = z.looseObject({
  search: z.string().optional(),
  sortBy: z.enum(["name", "status", "admin_state_up"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/network/networks/")({
  staticData: {
    section: "network",
    service: "networks",
    analytics: {
      name: "network.networks.list",
    },
  } satisfies RouteInfo,
  validateSearch: (search) => networksSearchSchema.safeParse(search).data,
  head: () => ({ meta: [{ title: t`Networks` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  if (!trpcClient) {
    throw new Error("trpcClient is not available in route context")
  }

  return <NetworksList project={projectId} />
}

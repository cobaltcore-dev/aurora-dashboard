import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { NetworksList } from "./-components/NetworksList"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/network/networks/")({
  staticData: {
    section: "network",
    service: "networks",
    analytics: {
      name: "network.networks.list",
    },
  } satisfies RouteInfo,
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

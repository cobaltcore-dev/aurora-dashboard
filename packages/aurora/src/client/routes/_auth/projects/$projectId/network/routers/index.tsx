import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { RoutersList } from "./-components/RoutersList"

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers/")({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.list",
    },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Routers` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  return <RoutersList />
}

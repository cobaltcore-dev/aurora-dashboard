import { createFileRoute } from "@tanstack/react-router"
import { Overview } from "./-components/Overview"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/overview")({
  staticData: { section: "compute", service: "overview" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  return <Overview project={projectId} client={trpcClient!} />
}

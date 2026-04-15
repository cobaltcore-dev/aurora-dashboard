import { createFileRoute } from "@tanstack/react-router"
import { Flavors } from "../-components/Flavors/List"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/flavors/")({
  staticData: { section: "compute", service: "flavors" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return <Flavors project={projectId} client={trpcClient!} />
}

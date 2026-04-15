import { createFileRoute } from "@tanstack/react-router"
import { Images } from "../-components/Images/List"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/images/")({
  staticData: { section: "compute", service: "images" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { trpcClient } = Route.useRouteContext()
  return <Images client={trpcClient!} />
}

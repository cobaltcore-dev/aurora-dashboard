import { createFileRoute } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/$pcaId/$certificateId/")({
  staticData: { section: "services", service: "pca" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/projects/$projectId/services/pca/$pcaId/$certificateId/"!</div>
}

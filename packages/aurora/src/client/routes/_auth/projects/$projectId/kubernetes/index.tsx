import { createFileRoute } from "@tanstack/react-router"
import { useContext } from "react"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ClusterList } from "./-components/ClusterList"
import { LandscapeContext } from "../kubernetes"

export const Route = createFileRoute("/_auth/projects/$projectId/kubernetes/")({
  staticData: {
    analytics: {
      name: "kubernetes.clusters.list",
    },
  } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { landscape } = useContext(LandscapeContext)

  return <ClusterList projectId={projectId} landscape={landscape} />
}

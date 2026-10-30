import { createFileRoute } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContainerDetailsView } from "./-components/ContainerDetailsView"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/containers/$containerId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
  } satisfies RouteInfo,
  component: ContainerDetailPage,
})

function ContainerDetailPage() {
  const { projectId, containerId } = Route.useParams() as { projectId: string; containerId: string }

  const { data: container } = trpcReact.keyManager.getContainer.useQuery({ project_id: projectId, containerId })
  useSetBreadcrumb(Route.id, container?.name ?? containerId)

  return <ContainerDetailsView projectId={projectId} containerId={containerId} />
}

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContainerDetail } from "./-components/ContainerDetail"
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
  const navigate = useNavigate()

  const { data: container } = trpcReact.keyManager.getContainer.useQuery({ project_id: projectId, containerId })
  useSetBreadcrumb(Route.id, container?.name ?? containerId)

  return (
    <ContainerDetail
      projectId={projectId}
      containerId={containerId}
      onBack={() => {
        void navigate({
          to: "/projects/$projectId/authorization/key-manager/containers/",
          params: { projectId },
        })
      }}
    />
  )
}

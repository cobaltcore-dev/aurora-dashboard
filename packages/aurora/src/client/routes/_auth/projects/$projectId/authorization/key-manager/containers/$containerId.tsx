import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import { ContainerDetail } from "./-components/ContainerDetail"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/containers/$containerId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Container Detail` },
  } satisfies RouteInfo,
  component: ContainerDetailPage,
})

function ContainerDetailPage() {
  const { projectId, containerId } = Route.useParams() as { projectId: string; containerId: string }
  const navigate = useNavigate()

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

import { createRoute, useNavigate } from "@tanstack/react-router"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { containersRoute } from "./index"
import { ContainerDetail } from "./ContainerDetail"

export const containerDetailRoute = createRoute({
  getParentRoute: () => containersRoute,
  path: "/$containerId",
  component: ContainerDetailPage,
})

function ContainerDetailPage() {
  const { projectId } = containerDetailRoute.useRouteContext()
  const { containerId } = containerDetailRoute.useParams()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Containers", onClick: () => navigate({ to: "/containers" }) },
    { label: containerId.slice(0, 8) + "…", active: true },
  ])

  return (
    <ContainerDetail projectId={projectId} containerId={containerId} onBack={() => navigate({ to: "/containers" })} />
  )
}

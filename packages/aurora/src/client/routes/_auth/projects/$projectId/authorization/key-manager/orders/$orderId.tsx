import { createFileRoute } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { OrderDetailsView } from "./-components/OrderDetailsView"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/orders/$orderId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
  } satisfies RouteInfo,
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { projectId, orderId } = Route.useParams() as { projectId: string; orderId: string }

  const { data: order } = trpcReact.keyManager.getOrder.useQuery({ project_id: projectId, orderId })
  useSetBreadcrumb(Route.id, order?.type ? `${order.type} (${orderId})` : orderId)

  return <OrderDetailsView projectId={projectId} orderId={orderId} />
}

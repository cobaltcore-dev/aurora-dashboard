import { createRoute, useNavigate } from "@tanstack/react-router"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { ordersRoute } from "./index"
import { OrderDetail } from "./OrderDetail"

export const orderDetailRoute = createRoute({
  getParentRoute: () => ordersRoute,
  path: "/$orderId",
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { projectId } = orderDetailRoute.useRouteContext()
  const { orderId } = orderDetailRoute.useParams()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Orders", onClick: () => navigate({ to: "/orders" }) },
    { label: orderId.slice(0, 8) + "…", active: true },
  ])

  return <OrderDetail projectId={projectId} orderId={orderId} onBack={() => navigate({ to: "/orders" })} />
}

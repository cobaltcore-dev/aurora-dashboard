import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import { OrderDetail } from "./-components/OrderDetail"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/orders/$orderId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Order Detail` },
  } satisfies RouteInfo,
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { projectId, orderId } = Route.useParams() as { projectId: string; orderId: string }
  const navigate = useNavigate()

  return (
    <OrderDetail
      projectId={projectId}
      orderId={orderId}
      onBack={() => {
        void navigate({
          to: "/projects/$projectId/authorization/key-manager/orders/",
          params: { projectId },
        })
      }}
    />
  )
}

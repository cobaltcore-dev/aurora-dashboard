import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { t } from "@lingui/core/macro"
import { OrdersList } from "./-components/OrdersList"
import { uuidFromRef } from "../-components/utils"
import type { Order } from "@/server/KeyManager/types/keyManager"
import type { RouteInfo } from "@/client/routes/routeInfo"

const ordersSearchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/orders/")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    analytics: { name: "authorization.key-manager.orders.list" },
  } satisfies RouteInfo,
  validateSearch: (s) => ordersSearchSchema.catch({}).parse(s),
  head: () => ({ meta: [{ title: t`Key Manager Orders` }] }),
  component: OrdersListPage,
})

function OrdersListPage() {
  const { projectId } = Route.useParams() as { projectId: string }
  const { search = "", page = 1 } = Route.useSearch()
  const navigate = useNavigate()

  const handleSearchChange = (value: string) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/orders",
      params: { projectId },
      search: { search: value || undefined, page: undefined },
    })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/orders",
      params: { projectId },
      search: { search: search || undefined, page: newPage === 1 ? undefined : newPage },
    })
  }
  const handleShowDetail = (order: Order) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/orders/$orderId",
      params: { projectId, orderId: uuidFromRef(order.order_ref) },
    })
  }

  return (
    <OrdersList
      projectId={projectId}
      search={search}
      page={page}
      onSearchChange={handleSearchChange}
      onPageChange={handlePageChange}
      onShowDetail={handleShowDetail}
    />
  )
}

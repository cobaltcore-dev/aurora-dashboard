import { createRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { rootRoute } from "../__root"
import { OrdersList } from "./OrdersList"
import { uuidFromRef } from "../../utils"
import type { Order } from "../../../server/types"

const ordersSearchSchema = z.object({
  sort: z.string().optional(),
  page: z.number().optional(),
})

export const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders",
  validateSearch: (s) => ordersSearchSchema.catch({}).parse(s),
  component: OrdersListPage,
})

function OrdersListPage() {
  const { projectId } = ordersRoute.useRouteContext()
  const { sort = "created:desc", page = 1 } = ordersRoute.useSearch()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Orders", active: true },
  ])

  const handleSort = (value: string) => {
    void navigate({ to: "/orders", search: { sort: value, page: undefined } })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({ to: "/orders", search: { sort: sort || undefined, page: newPage === 1 ? undefined : newPage } })
  }
  const handleShowDetail = (order: Order) => {
    void navigate({
      to: "/orders/$orderId",
      params: { orderId: uuidFromRef(order.order_ref) },
    })
  }

  return (
    <OrdersList
      projectId={projectId}
      sort={sort}
      page={page}
      onSortChange={handleSort}
      onPageChange={handlePageChange}
      onShowDetail={handleShowDetail}
    />
  )
}

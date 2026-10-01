import { createRouter } from "@tanstack/react-router"
import { rootRoute } from "./routes/__root"
import { indexRoute } from "./routes/index"
import { secretsRoute } from "./routes/secrets/index"
import { secretDetailRoute } from "./routes/secrets/$secretId"
import { containersRoute } from "./routes/containers/index"
import { containerDetailRoute } from "./routes/containers/$containerId"
import { ordersRoute } from "./routes/orders/index"
import { orderDetailRoute } from "./routes/orders/$orderId"

const routeTree = rootRoute.addChildren([
  indexRoute,
  secretsRoute.addChildren([secretDetailRoute]),
  containersRoute.addChildren([containerDetailRoute]),
  ordersRoute.addChildren([orderDetailRoute]),
])

export function createKmRouter(basepath: string, projectId: string) {
  return createRouter({
    routeTree,
    basepath,
    context: { projectId },
  })
}

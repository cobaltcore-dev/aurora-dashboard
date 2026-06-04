import { authRouters } from "./Authentication/routers"
import { computeRouters } from "./Compute/routers"
import { objectStorageRouters } from "./Storage/routers"
import { projectRouters } from "./Project/routers"
import { networkRouters } from "./Network/routers"
import { serviceRouters } from "./Services/routers"
import { notificationRouters } from "./Notification/routers"
import { auroraRouter, mergeRouters } from "./trpc"

export const appRouter = mergeRouters(
  auroraRouter(authRouters),
  auroraRouter(computeRouters),
  auroraRouter(objectStorageRouters),
  auroraRouter(projectRouters),
  auroraRouter(networkRouters),
  auroraRouter(serviceRouters),
  auroraRouter(notificationRouters)
)

export type AuroraRouter = typeof appRouter

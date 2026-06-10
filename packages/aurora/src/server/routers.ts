import { authRouters } from "./Authentication/routers"
import { buildComputeRouters } from "./Compute/routers"
import { objectStorageRouters } from "./Storage/routers"
import { projectRouters } from "./Project/routers"
import { networkRouters } from "./Network/routers"
import { serviceRouters } from "./Services/routers"
import { auroraRouter, mergeRouters } from "./trpc"

export const buildAppRouter = (policyDir?: string) =>
  mergeRouters(
    auroraRouter(authRouters),
    auroraRouter(buildComputeRouters(policyDir)),
    auroraRouter(objectStorageRouters),
    auroraRouter(projectRouters),
    auroraRouter(networkRouters),
    auroraRouter(serviceRouters)
  )

export type AuroraRouter = ReturnType<typeof buildAppRouter>

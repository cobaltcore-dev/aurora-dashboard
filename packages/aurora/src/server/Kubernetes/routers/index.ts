import { auroraRouter } from "../../trpc"
import { gardenerInfoRouter } from "./gardenerInfoRouter"

export const kubernetesRouters = {
  kubernetes: auroraRouter({
    ...gardenerInfoRouter,
  }),
}

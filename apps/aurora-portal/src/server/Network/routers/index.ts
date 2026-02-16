import { networkRouter } from "./networkrouter"
import { floatingIpRouter } from "./floatingIpRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    ...floatingIpRouter,
  }),
}

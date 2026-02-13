import { networkRouter } from "./networkrouter"
import { floatingIPsRouter } from "./floatingIPsRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    ...floatingIPsRouter,
  }),
}

import { networkRouter } from "./networkrouter"
import { floatingIpRouter } from "./floatingIpRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    ...floatingIpRouter,
    ...securityGroupRouter,
  }),
}

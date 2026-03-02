import { floatingIpRouter } from "./floatingIpRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    floatingIp: floatingIpRouter,
    ...securityGroupRouter,
  }),
}

import { floatingIpRouter } from "./floatingIpRouter"
import { portRouter } from "./portRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    floatingIp: floatingIpRouter,
    port: portRouter,
    securityGroup: securityGroupRouter,
  }),
}

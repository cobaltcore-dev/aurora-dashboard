import { floatingIpRouter } from "./floatingIpRouter"
import { networkRouter } from "./networkRouter"
import { portRouter } from "./portRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    floatingIp: floatingIpRouter,
    port: portRouter,
    securityGroup: securityGroupRouter,
  }),
}

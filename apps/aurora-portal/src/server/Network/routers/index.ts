import { floatingIpRouter } from "./floatingIpRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { securityGroupRuleRouter } from "./securityGroupRuleRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    floatingIp: floatingIpRouter,
    securityGroup: securityGroupRouter,
    securityGroupRule: securityGroupRuleRouter,
  }),
}

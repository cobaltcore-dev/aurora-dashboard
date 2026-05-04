import { floatingIpRouter } from "./floatingIpRouter"
import { networkRouter } from "./networkRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { securityGroupRuleRouter } from "./securityGroupRuleRouter"
import { rbacPolicyRouter } from "./rbacPolicyRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    floatingIp: floatingIpRouter,
    securityGroup: securityGroupRouter,
    securityGroupRule: securityGroupRuleRouter,
    rbacPolicy: rbacPolicyRouter,
  }),
}

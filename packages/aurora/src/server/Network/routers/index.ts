import { floatingIpRouter } from "./floatingIpRouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { securityGroupRuleRouter } from "./securityGroupRuleRouter"
import { rbacPolicyRouter } from "./rbacPolicyRouter"
import { routersRouter } from "./routersRouter"
import { buildNetworkPermissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const buildNetworkRouters = (policyDir: string) => ({
  network: auroraRouter({
    floatingIp: floatingIpRouter,
    securityGroup: securityGroupRouter,
    securityGroupRule: securityGroupRuleRouter,
    rbacPolicy: rbacPolicyRouter,
    routers: routersRouter,
    ...buildNetworkPermissionRouter(policyDir),
  }),
})

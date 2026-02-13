import { networkRouter } from "./networkrouter"
import { securityGroupRouter } from "./securityGroupRouter"
import { auroraRouter } from "../../trpc"

export const networkRouters = {
  network: auroraRouter({
    ...networkRouter,
    ...securityGroupRouter,
  }),
}

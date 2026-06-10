import { serverRouter } from "./serverRouter"
import { imageRouter } from "./imageRouter"
import { keypairRouter } from "./keypairRouter"
import { serverGroupRouter } from "./serverGroupRouter"
import { flavorRouter } from "./flavorRouter"
import { buildPermissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const buildComputeRouters = (policyDir?: string) => ({
  compute: auroraRouter({
    ...serverRouter,
    ...flavorRouter,
    ...imageRouter,
    ...keypairRouter,
    ...serverGroupRouter,
    ...buildPermissionRouter(policyDir),
  }),
})

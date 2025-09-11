import { serverRouter } from "./serverRouter"
import { imageRouter } from "./imageRouter"
import { keypairRouter } from "./keypairRouter"
import { serverGroupRouter } from "./serverGroupRouter"
import { flavorRouter } from "./flavorRouter"
import { permissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const computeRouters = {
  compute: auroraRouter({
    ...serverRouter,
    ...flavorRouter,
    ...imageRouter,
    ...keypairRouter,
    ...serverGroupRouter,
    ...permissionRouter,
  }),
}

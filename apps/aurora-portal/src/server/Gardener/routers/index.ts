import { shootRouter } from "./shootRouter"
import { auroraRouter } from "../../trpc"

export const gardenerRouters = {
  gardener: auroraRouter({
    ...shootRouter,
  }),
}

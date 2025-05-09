import { shootRouter } from "./shootRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { auroraRouter } from "../../trpc"

export const gardenerRouters = {
  gardener: auroraRouter({
    ...shootRouter,
    ...cloudProfilesRouter,
  }),
}

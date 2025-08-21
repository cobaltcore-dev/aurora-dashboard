import { shootRouter } from "./shootRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { permissionsRouter } from "./permissionsRouter"
import { auroraRouter } from "../../trpc"

export const gardenerRouters = {
  gardener: auroraRouter({
    ...shootRouter,
    ...cloudProfilesRouter,
    ...permissionsRouter,
  }),
}

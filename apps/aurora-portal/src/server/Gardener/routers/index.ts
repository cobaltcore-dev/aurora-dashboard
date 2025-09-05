import { clustersRouter } from "./clustersRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { permissionsRouter } from "./permissionsRouter"
import { auroraRouter } from "../../trpc"

export const gardenerRouters = {
  gardener: auroraRouter({
    ...clustersRouter,
    ...cloudProfilesRouter,
    ...permissionsRouter,
  }),
}

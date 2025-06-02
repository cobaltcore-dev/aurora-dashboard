import { clustersRouter } from "./clustersRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { router } from "./trpc"

export const gardenerRouter = router({
  ...clustersRouter,
  ...cloudProfilesRouter,
})

export type GardenerRouter = typeof gardenerRouter

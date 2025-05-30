import { shootRouter } from "./shootRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { router } from "./trpc"

export const gardenerRouter = router({
  ...shootRouter,
  ...cloudProfilesRouter,
})

export type GardenerRouter = typeof gardenerRouter

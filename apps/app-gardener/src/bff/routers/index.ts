import { clustersRouter } from "./clustersRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { router } from "./trpc"
import { client } from "../k8sClient"

export const gardenerRouter = router({
  ...clustersRouter(client),
  ...cloudProfilesRouter(client),
})

export type GardenerRouter = typeof gardenerRouter

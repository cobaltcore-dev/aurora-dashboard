import { auroraRouter } from "../../trpc"
import { gardenerInfoRouter } from "./gardenerInfoRouter"
import { permissionsRouter } from "./permissionsRouter"
import { gettingStartedRouter } from "./gettingStartedRouter"
import { clustersRouter } from "./clustersRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { externalNetworksRouter } from "./externalNetworksRouter"

export const kubernetesRouters = {
  kubernetes: auroraRouter({
    ...gardenerInfoRouter,
    ...permissionsRouter,
    ...gettingStartedRouter,
    clusters: clustersRouter,
    cloudProfiles: cloudProfilesRouter,
    externalNetworks: externalNetworksRouter,
  }),
}

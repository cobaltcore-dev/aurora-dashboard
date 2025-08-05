import { shootRouter } from "./shootRouter"
import { cloudProfilesRouter } from "./cloudProfilesRouter"
import { accessReviewRouter } from "./accessReviewRouter"
import { auroraRouter } from "../../trpc"

export const gardenerRouters = {
  gardener: auroraRouter({
    ...shootRouter,
    ...cloudProfilesRouter,
    ...accessReviewRouter,
  }),
}

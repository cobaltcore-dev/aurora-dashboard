import { sessionRouter } from "./sessionRouter"

import { auroraRouter } from "../../trpc"

export const authRouters = {
  auth: auroraRouter({
    ...sessionRouter,
  }),
}

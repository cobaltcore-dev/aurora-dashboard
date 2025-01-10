import { projectRouter } from "./projectRouter"
import { userRouter } from "./userRouter"

import { router } from "../../../shared/trpc"

export const identityRouters = {
  identity: router({
    ...projectRouter,
    ...userRouter,
  }),
}

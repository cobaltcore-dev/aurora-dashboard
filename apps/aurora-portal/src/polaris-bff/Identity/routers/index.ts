import { projectRouter } from "./projectRouter"
import { userRouter } from "./userRouter"

import { router } from "../../trpc"

export const identityRouters = {
  identity: router({
    ...projectRouter,
    ...userRouter,
  }),
}

import { userRouter } from "./userRouter"
import { authRouter } from "./authRouter"

import { auroraRouter } from "../../trpc"

export const identityRouters = {
  identity: auroraRouter({
    ...userRouter,
    ...authRouter,
  }),
}

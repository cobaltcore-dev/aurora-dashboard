import { userRouter } from "./userRouter"
import { tokenRouter } from "./tokenRouter"

import { router } from "../../trpc"

export const identityRouters = {
  identity: router({
    ...userRouter,
    ...tokenRouter,
  }),
}

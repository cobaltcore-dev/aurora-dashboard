import { userRouter } from "./userRouter"
import { tokenRouter } from "./tokenRouter"

import { auroraRouter } from "../../trpc"

export const identityRouters = {
  identity: auroraRouter({
    ...userRouter,
    ...tokenRouter,
  }),
}

import { tokenRouter } from "./tokenRouter"

import { auroraRouter } from "../../trpc"

export const authRouters = {
  auth: auroraRouter({
    ...tokenRouter,
  }),
}

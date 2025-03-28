import { networkRouter } from "./networkrouter"
import { auroraRouter } from "../../trpc"

export const authRouters = {
  auth: auroraRouter({
    ...networkRouter,
  }),
}

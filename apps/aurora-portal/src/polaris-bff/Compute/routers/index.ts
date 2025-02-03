import { serverRouter } from "./serverRouter"
import { auroraRouter } from "../../trpc"

export const computeRouters = {
  compute: auroraRouter({ ...serverRouter }),
}

import { serverRouter } from "./serverRouter"
import { imageRouter } from "./imageRouter"
import { keypairRouter } from "./keypairRouter"
import { serverGroupRouter } from "./serverGroupRouter"
import { auroraRouter } from "../../trpc"

export const computeRouters = {
  compute: auroraRouter({ ...serverRouter, ...imageRouter, ...keypairRouter, ...serverGroupRouter }),
}

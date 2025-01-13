import { serverRouter } from "./serverRouter"
import { router } from "../../trpc"

export const computeRouters = {
  compute: router({ ...serverRouter }),
}

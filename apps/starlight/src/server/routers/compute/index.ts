import { serverRouter } from "./serverRouter"
import { router } from "../../../shared/trpc"

export const computeRouters = {
  compute: router({ ...serverRouter }),
}

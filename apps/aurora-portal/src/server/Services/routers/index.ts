import { auroraRouter } from "../../trpc"
import { clavisRouter } from "./pcaRouter"

export const serviceRouters = {
  services: auroraRouter({
    ca: clavisRouter,
  }),
}

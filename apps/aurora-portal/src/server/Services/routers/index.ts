import { auroraRouter } from "../../trpc"
import { pcaRouter } from "./pcaRouter"

export const serviceRouters = {
  services: auroraRouter({
    pca: pcaRouter,
  }),
}

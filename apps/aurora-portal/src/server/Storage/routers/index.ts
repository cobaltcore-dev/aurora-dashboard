import { swiftObjectStorageRouter } from "./swiftObjectStorageRouter"
import { auroraRouter } from "../../trpc"

export const objectStorageRouters = {
  objectStorage: auroraRouter({
    ...swiftObjectStorageRouter,
  }),
}

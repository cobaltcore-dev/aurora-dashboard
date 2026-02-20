import { swiftRouter } from "./swiftRouter"
import { auroraRouter } from "../../trpc"

export const objectStorageRouters = {
  storage: {
    swift: auroraRouter({
      ...swiftRouter,
    }),
  },
}

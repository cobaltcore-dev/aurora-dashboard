import { entityRouter } from "./entityRouter"
import { router } from "../../shared/trpc"

export const appRouter = router({
  extensionMars: router({ ...entityRouter }),
})

export type AppRouter = typeof appRouter

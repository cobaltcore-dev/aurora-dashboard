import { entityRouter } from "./entityRouter"
import { t } from "./trpc"

export const appRouter = t.router(entityRouter)
export type AppRouter = typeof appRouter

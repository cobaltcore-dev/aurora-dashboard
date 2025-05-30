import { entityRouter } from "./entityRouter"
import { router } from "./trpc"

// Example usage of the buildRouter function
export const appRouter = router(entityRouter)

export type AppRouter = typeof appRouter

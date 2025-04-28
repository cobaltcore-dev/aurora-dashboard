import { entityRouter } from "./entityRouter"
import { auroraRouter } from "./trpc"

// Example usage of the buildRouter function
export const appRouter = auroraRouter(entityRouter)

export type AppRouter = typeof appRouter

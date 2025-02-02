import { entityRouter } from "./entityRouter"
import { trpc } from "./trpc"

// Example usage of the buildRouter function
const appRouter = trpc.router(entityRouter)

export type AppRouter = typeof appRouter

export const registerRouter = () => ({
  appRouter,
})

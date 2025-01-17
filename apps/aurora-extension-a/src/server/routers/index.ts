import { entityRouter } from "./entityRouter"
import { trpc } from "./trpc"

// Example usage of the buildRouter function
export const appRouter = trpc.router({
  extensionA: trpc.router(entityRouter),
})

export type AppRouter = typeof appRouter

export default appRouter

export const buildRouter = (client: typeof trpc) => {
  return client.router({
    test: client.procedure.query(() => "test"),
  })
}

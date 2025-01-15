import { entityRouter } from "./entityRouter"
import { trpc } from "./trpc"

// Example usage of the buildRouter function
export const appRouter = trpc.router({
  extensionA: trpc.router(entityRouter),
})

export type AppRouter = typeof appRouter

// import { initTRPC } from "@trpc/server"

// // Generic function, tt is typed dynamically at call-site
// export const testRouters = <T extends ReturnType<typeof initTRPC.create>>(t: T) => {
//   return t.router({
//     test: t.procedure.query(() => {
//       return "test"
//     }),
//   })
// }

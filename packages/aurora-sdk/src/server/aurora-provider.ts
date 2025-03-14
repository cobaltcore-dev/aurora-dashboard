// packages/aurora-server/src/AuroraServer.ts
import { initTRPC } from "@trpc/server"
import type { AuroraContext } from "./aurora-context"
import { TRPCError } from "@trpc/server"

export function getAuroraProvider<TContext extends AuroraContext = AuroraContext>() {
  const t = initTRPC.context<TContext>().create()

  const publicProcedure = t.procedure

  const protectedProcedure = publicProcedure.use(async function isAuthenticated(opts) {
    if (opts.ctx.validateSession() === false) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    }
    return opts.next({
      ctx: opts.ctx,
    })
  })

  return {
    getAuroraRouter: t.router,
    getAuroraMergeRouters: t.mergeRouters,
    getAuroraPublicProcedure: publicProcedure,
    // Explicitly casting to avoid TypeScript inferring deep, non-portable types from dependent packages.
    getAuroraProtectedProcedure: protectedProcedure as typeof publicProcedure,
  }
}

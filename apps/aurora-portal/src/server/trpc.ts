import type { AuroraPortalContext } from "./context"
import { initTRPC, TRPCError } from "@trpc/server"
const t = initTRPC.context<AuroraPortalContext>().create()

export const auroraRouter = t.router
export const mergeRouters = t.mergeRouters
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

export const protectedProcedure = publicProcedure.use(async function isAuthenticated(opts) {
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

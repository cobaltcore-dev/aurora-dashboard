import { initTRPC, TRPCError } from "@trpc/server"
import { Context } from "./context"
// You can use any variable name you like.
// We use t to keep things simple.
export const t = initTRPC.context<Context>().create()

export const router = t.router
export const mergeRouters = t.mergeRouters

export const publicProcedure = t.procedure

export const protectedProcedure = publicProcedure.use(function isAuthed(opts) {
  if (opts.ctx.getSessionCookie() === null || opts.ctx.getSessionCookie() === undefined) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    })
  }
  return opts.next({
    ctx: opts.ctx,
  })
})

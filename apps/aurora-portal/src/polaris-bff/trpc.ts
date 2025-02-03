import { getAuroraProvider } from "@cobaltcore-dev/aurora-sdk"
import { AuroraTRPCError } from "@cobaltcore-dev/aurora-sdk"
import type { Context } from "./context"
// You can use any variable name you like.
// We use t to keep things simple.
const auroraProvider = getAuroraProvider<Context>()

export const auroraRouter = auroraProvider.getAuroraRouter
export const mergeRouters = auroraProvider.getAuroraMergeRouters

export const publicProcedure = auroraProvider.getAuroraPublicProcedure

export const protectedProcedure = publicProcedure.use(function isAuthed(opts: {
  ctx: { getSessionCookie: () => string | null | undefined }
  next: (arg0: { ctx: any }) => any
}) {
  if (opts.ctx.getSessionCookie() === null || opts.ctx.getSessionCookie() === undefined) {
    throw new AuroraTRPCError({
      code: "UNAUTHORIZED",
    })
  }
  return opts.next({
    ctx: opts.ctx,
  })
})

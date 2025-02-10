// packages/aurora-server/src/AuroraServer.ts
import { initTRPC } from "@trpc/server"
import type { AuroraContext } from "./aurora-context"
import { AuroraSDKTRPCError } from "./errors"

export function getAuroraProvider<TContext extends AuroraContext = AuroraContext>() {
  const t = initTRPC.context<TContext>().create()
  const publicProcedure = t.procedure

  const protectedProcedure = publicProcedure.use(async function isAuthenticated(opts) {
    const { authToken, token } = await opts.ctx.validateSession()
    if (!authToken || !token) {
      throw new AuroraSDKTRPCError({
        code: "UNAUTHORIZED",
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
    getAuroraProtectedProcedure: protectedProcedure,
  }
}

// export type AuroraRouterType = typeof AuroraRouter
// export type AuroraProcedureType = typeof AuroraProcedure
// export type MergeRoutersType = typeof mergeRouters

// export type InferRouterInputs<T extends AuroraRouterType> = inferRouterInputs<T>
// export type InferRouterOutputs<T extends AuroraRouterType> = inferRouterOutputs<T>

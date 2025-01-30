// packages/aurora-server/src/AuroraServer.ts
import { initTRPC } from "@trpc/server"
// import { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import type { Context } from "./context"

export function getAuroraProvider<TContext extends Context>() {
  const t = initTRPC.context<TContext>().create()

  return {
    getAuroraRouter: () => t.router,
    getAuroraMergeRouters: () => t.mergeRouters,
    getAuroraPublicProcedure: () => t.procedure,
  }
}

// export type AuroraRouterType = typeof AuroraRouter
// export type AuroraProcedureType = typeof AuroraProcedure
// export type MergeRoutersType = typeof mergeRouters

// export type InferRouterInputs<T extends AuroraRouterType> = inferRouterInputs<T>
// export type InferRouterOutputs<T extends AuroraRouterType> = inferRouterOutputs<T>

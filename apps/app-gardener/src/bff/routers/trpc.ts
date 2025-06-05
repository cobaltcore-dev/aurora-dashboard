import { initTRPC } from "@trpc/server"
export const t = initTRPC.create()

export const router = t.router
export const createCallerFactory = t.createCallerFactory
export const mergeRouters = t.mergeRouters
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure

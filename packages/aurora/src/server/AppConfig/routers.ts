import { auroraRouter, publicProcedure } from "../trpc"

/**
 * Exposes the domain configuration the BFF resolved for the current request. It is a
 * public procedure on purpose: an unauthenticated client (the login screen) receives the
 * base layer, and once the user is authenticated the same query returns the layer merged
 * with any overrides matching their home domain. Returns an empty object when the consumer
 * configured no `appConfig`.
 */
export const appConfigRouters = {
  appConfig: auroraRouter({
    get: publicProcedure.query(({ ctx }) => ctx.appConfig ?? {}),
  }),
}

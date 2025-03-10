import { z } from "zod"
import { publicProcedure } from "../../trpc"

export const sessionRouter = {
  getCurrentUserSession: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()

    return token?.tokenData || null
  }),

  setCurrentProject: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const openstackSession = await ctx.rescopeSession({ project: { id: input } })
    return openstackSession?.getToken()?.tokenData || null
  }),

  setCurrentDomain: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const openstackSession = await ctx.rescopeSession({ domain: { id: input } })
    return openstackSession?.getToken()?.tokenData || null
  }),

  getAuthToken: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()
    return token?.authToken || null
  }),

  createUserSession: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const openstackSession = await ctx.createSession({
        user: input.user,
        password: input.password,
        domain: input.domainName,
      })

      const tokenData = openstackSession.getToken()?.tokenData
      if (!tokenData) {
        throw new Error("Could not get token data")
      }
      return tokenData
    }),

  terminateUserSession: publicProcedure.mutation(async ({ ctx }) => {
    ctx.terminateSession()
  }),
}

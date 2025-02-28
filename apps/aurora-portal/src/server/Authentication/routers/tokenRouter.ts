import { z } from "zod"
import { publicProcedure } from "../../trpc"

export const tokenRouter = {
  token: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()

    return token?.tokenData || null
  }),

  authToken: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()
    return token?.authToken || null
  }),

  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const openstackSession = await ctx.createSession({
        user: input.user,
        password: input.password,
        domain: input.domainName,
      })

      return openstackSession.getToken()?.tokenData || null
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.terminateSession()
  }),
}

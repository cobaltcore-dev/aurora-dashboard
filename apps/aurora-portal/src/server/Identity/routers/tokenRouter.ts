import { z } from "zod"
import { publicProcedure } from "../../trpc"

export const tokenRouter = {
  getAuthStatus: publicProcedure.query(async ({ ctx }) => {
    const { openstack } = ctx.validateSession()
    const token = await openstack?.getToken()

    const isAuthenticated = !!token?.authToken

    return { isAuthenticated, user: token?.tokenData?.user, reason: isAuthenticated ? null : "Not authenticated" }
  }),
  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { openstack } = await ctx.createSession({
          user: input.user,
          password: input.password,
          domain: input.domainName,
        })
        const token = await openstack?.getToken()
        return { user: { ...token?.tokenData.user, session_expires_at: token?.tokenData.expires_at } }
      } catch (err: unknown) {
        let errorMessage = "Unknown error"
        if (err instanceof Error) {
          errorMessage = err.message
        }
        return { user: null, reason: errorMessage }
      }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.terminateSession()
    return { success: true }
  }),
}

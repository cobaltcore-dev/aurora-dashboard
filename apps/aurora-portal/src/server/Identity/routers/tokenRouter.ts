import { z } from "zod"
import { publicProcedure } from "../../trpc"

export const tokenRouter = {
  getAuthStatus: publicProcedure.query(async ({ ctx }) => {
    const session = ctx.validateSession()
    const token = session?.openstack?.getToken()

    if (!token?.authToken) {
      return { isAuthenticated: false, user: null, reason: "No token found" }
    }

    return {
      isAuthenticated: true,
      user: { ...token.tokenData.user, session_expires_at: token.tokenData.expires_at },
      reason: null,
    }
  }),
  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const openstackSession = await ctx.createSession({
          user: input.user,
          password: input.password,
          domain: input.domainName,
        })
        const token = openstackSession.getToken()
        if (!token) throw new Error("Could not login")
        return { user: { ...token?.tokenData.user, session_expires_at: token.tokenData.expires_at } }
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

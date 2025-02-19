import { z } from "zod"
import { protectedProcedure, publicProcedure } from "../../trpc"
import { createToken, rescopeToken, validateToken } from "../services/authApi"

export const authRouter = {
  getAuthStatus: publicProcedure.query(async ({ ctx }) => {
    const authToken = ctx.getSessionCookie()
    if (!authToken) {
      return { isAuthenticated: false, user: null, reason: "No token found" }
    }

    return validateToken(authToken, { nocatalog: true })
      .then((token) => ({
        isAuthenticated: true,
        user: { ...token.user, session_expires_at: token.expires_at },
        reason: null,
      }))
      .catch((err: unknown) => {
        let errorMessage = "Unknown error"
        if (err instanceof Error) {
          errorMessage = err.message
        }
        return { isAuthenticated: false, user: null, reason: errorMessage }
      })
  }),
  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { authToken, tokenData } = await createToken(input)
        const expDate = new Date(tokenData.expires_at)
        ctx.setSessionCookie(authToken, { expires: expDate })
        return { user: { ...tokenData.user, session_expires_at: tokenData.expires_at } }
      } catch (err: unknown) {
        let errorMessage = "Unknown error"
        if (err instanceof Error) {
          errorMessage = err.message
        }
        return { user: null, reason: errorMessage }
      }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.deleteSessionCookie()
    return { success: true }
  }),

  rescopeToken: protectedProcedure
    .input(z.object({ domainId: z.string().optional(), projectId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { authToken } = await ctx.validateSession()
      if (!authToken) {
        throw new Error("No token found")
      }
      const scope = input.domainId
        ? { domain: { id: input.domainId } }
        : input.projectId
          ? { project: { id: input.projectId } }
          : {}

      try {
        const newAuthData = await rescopeToken(authToken, scope)
        const expDate = new Date(newAuthData.tokenData.expires_at)
        ctx.setSessionCookie(newAuthData.authToken, { expires: expDate })

        return { user: { ...newAuthData.tokenData.user, session_expires_at: newAuthData.tokenData.expires_at } }
      } catch (err: unknown) {
        let errorMessage = "Unknown error"
        if (err instanceof Error) {
          errorMessage = err.message
        }
        return { user: null, reason: errorMessage }
      }
    }),
}

import { z } from "zod"
import { publicProcedure } from "../../trpc"
import { createUnscopedToken, validateToken } from "../services/tokenApi"

export const tokenRouter = {
  getAuthStatus: publicProcedure.query(async ({ ctx }) => {
    const authToken = ctx.getSessionCookie()
    if (!authToken) {
      return { isAuthenticated: false, user: null, reason: "No token found" }
    }

    const token = await validateToken(authToken, { nocatalog: true })
    // console.log("========", token)
    if (!token.ok) {
      return { isAuthenticated: false, user: null, reason: token.statusText }
    }
    const tokenData = await token.json().then((data) => data.token)
    return {
      isAuthenticated: true,
      user: { ...tokenData.user, session_expires_at: tokenData.expires_at },
      reason: null,
    }
  }),
  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const token = await createUnscopedToken(input)

      if (!token.ok) {
        return { user: null, reason: token.statusText }
      }
      const tokenData = await token.json().then((data) => data.token)
      const authToken = token.headers.get("X-Subject-Token")
      const expDate = new Date(tokenData.expires_at)

      ctx.setSessionCookie(authToken, { expires: expDate })
      return { user: { ...tokenData.user, session_expires_at: tokenData.expires_at } }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.deleteSessionCookie()
    return { success: true }
  }),
}

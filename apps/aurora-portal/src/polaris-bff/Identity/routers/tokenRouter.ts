import { z } from "zod"
import { publicProcedure } from "../../trpc"
import { createUnscopedToken, validateToken } from "../services/tokenApi"

export const tokenRouter = {
  getAuthStatus: publicProcedure.query(async ({ ctx }) => {
    const authToken = ctx.getSessionCookie()
    if (authToken) {
      const token = await validateToken(authToken, { nocatalog: true })
      const tokenData = await token.json().then((data) => data.token)

      return { isAuthenticated: true, user: tokenData.user }
    }
    return { isAuthenticated: false, user: null }
  }),
  login: publicProcedure
    .input(z.object({ user: z.string(), password: z.string(), domainName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const token = await createUnscopedToken(input)
      const tokenData = await token.json().then((data) => data.token)
      const authToken = token.headers.get("X-Subject-Token")
      const expDate = new Date(tokenData.expires_at)

      ctx.setSessionCookie(authToken, { expires: expDate })
      return { tokenData, authToken }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.deleteSessionCookie()
    return { success: true }
  }),
}

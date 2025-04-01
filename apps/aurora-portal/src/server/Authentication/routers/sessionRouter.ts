import { z } from "zod"
import { publicProcedure } from "../../trpc"

export const sessionRouter = {
  getCurrentUserSession: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()

    return token?.tokenData || null
  }),

  getAuthToken: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()
    return token?.authToken || null
  }),

  getCurrentScope: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()
    if (!token) {
      return null
    }
    const project = token.tokenData.project
    const domain = project?.domain || token.tokenData.domain
    return {
      project: project,
      domain: domain,
    }
  }),

  setCurrentScope: publicProcedure
    .input(z.object({ domainId: z.string(), projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await ctx.rescopeSession({ domainId: input.domainId, projectId: input.projectId })
      const token = session?.getToken()
      if (!token) {
        return null
      }
      const project = token.tokenData.project
      const domain = project?.domain || token.tokenData.domain
      return {
        project: project,
        domain: domain,
      }
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

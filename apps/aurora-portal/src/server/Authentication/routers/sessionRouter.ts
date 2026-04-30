import { z } from "zod"
import { protectedProcedure, publicProcedure } from "../../trpc"
import { TRPCError } from "@trpc/server"

const discriminatedSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("domain"), domainId: z.string() }),
  z.object({ type: z.literal("project"), projectId: z.string() }),
  z.object({ type: z.literal("unscoped"), value: z.string() }),
])

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

  setCurrentScope: publicProcedure.input(discriminatedSchema).mutation(async ({ input, ctx }) => {
    switch (input.type) {
      case "domain": {
        const session = await ctx.rescopeSession({ domainId: input.domainId })
        const token = session?.getToken()

        return {
          project: null,
          domain: token?.tokenData.domain,
        }
      }
      case "project": {
        const session = await ctx.rescopeSession({ projectId: input.projectId })
        const token = session?.getToken()

        return {
          project: token?.tokenData.project,
          domain: token?.tokenData.project?.domain,
        }
      }
      case "unscoped": {
        await ctx.rescopeSession({})
        return {
          project: null,
          domain: null,
        }
      }
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

  /**
   * Returns the list of available OpenStack services from the current token's service catalog.
   *
   * Scoping decision: Uses `protectedProcedure` (no rescoping) because:
   * - This is a read-only operation that reads from the current token's catalog
   * - The service catalog is included in every scoped token (project, domain, or unscoped)
   * - No additional OpenStack API calls are made - just reading token metadata
   * - The frontend calls this after rescoping to a project to determine which UI sections to show
   * - Rescoping is unnecessary and would add overhead without benefit
   *
   * The service catalog content varies by token scope:
   * - Project-scoped tokens: Full catalog with project-level endpoints
   * - Domain-scoped tokens: Catalog with domain-level endpoints
   * - Unscoped tokens: May have limited or no catalog entries
   *
   * Frontend usage: Called in route loaders after `setCurrentScope` to conditionally
   * render navigation items and feature sections based on available services.
   */
  getAvailableServices: protectedProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()

    if (!token) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "OpenStack authentication token is required to access services",
      })
    }

    return (
      token?.tokenData.catalog
        ?.filter((catalogItem) => catalogItem?.endpoints.length)
        .map(({ name, type }) => ({ name, type })) || []
    )
  }),
}

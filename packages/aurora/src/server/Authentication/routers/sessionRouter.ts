import { z } from "zod"
import { mapScopeError, protectedProcedure, publicProcedure } from "../../trpc"
import { TRPCError } from "@trpc/server"

const discriminatedSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("domain"), domainId: z.string() }),
  z.object({ type: z.literal("project"), projectId: z.string() }),
  z.object({ type: z.literal("unscoped"), value: z.string() }),
])

export const sessionRouter = {
  getCurrentUserSession: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.openstack?.getToken()
    if (!token) return null

    // Return only safe, client-necessary fields to avoid exposing internal metadata
    return {
      user: token.tokenData.user,
      ...(token.tokenData.expires_at && { expires_at: token.tokenData.expires_at }),
      ...(token.tokenData.issued_at && { issued_at: token.tokenData.issued_at }),
      roles: token.tokenData.roles,
      project: token.tokenData.project,
      domain: token.tokenData.domain,
      catalog: token.tokenData.catalog,
    }
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

  // Errors from rescopeSession are handled by openstackErrorMiddleware
  setCurrentScope: protectedProcedure.input(discriminatedSchema).mutation(async ({ input, ctx }) => {
    switch (input.type) {
      case "domain": {
        let session
        try {
          session = await ctx.rescopeSession({ domainId: input.domainId })
        } catch (error) {
          // Distinguish an invalid session (UNAUTHORIZED) from a domain that
          // cannot be scoped to (NOT_FOUND) so the client can show the right message.
          throw mapScopeError(error, ctx, {
            notFoundMessage:
              "This domain doesn't exist or is not accessible with your current session. Please select an available domain.",
          })
        }
        const token = session?.getToken()

        if (!token?.tokenData.domain) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Failed to rescope to the requested domain.",
          })
        }

        return {
          project: null,
          domain: token.tokenData.domain,
        }
      }
      case "project": {
        let session
        try {
          session = await ctx.rescopeSession({ projectId: input.projectId })
        } catch (error) {
          // Keystone returns 401 both when the session is no longer valid
          // (e.g. changed in another browser tab) and when the project simply
          // does not exist / is not accessible. mapScopeError re-checks the base
          // token validity to surface the real cause (UNAUTHORIZED vs NOT_FOUND).
          throw mapScopeError(error, ctx, {
            notFoundMessage:
              "This project doesn't exist or is not accessible from your current domain. Please select a project from your current domain.",
          })
        }
        const token = session?.getToken()

        if (!token?.tokenData.project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Failed to rescope to the requested project.",
          })
        }

        return {
          project: token.tokenData.project,
          domain: token.tokenData.project.domain,
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
      try {
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
      } catch (error) {
        // Check if this is a SignalOpenstackApiError with status code 401
        if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials. Please check your domain, username, and password.",
          })
        }
        // Re-throw other errors as-is
        throw error
      }
    }),

  terminateUserSession: protectedProcedure.mutation(async ({ ctx }) => {
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

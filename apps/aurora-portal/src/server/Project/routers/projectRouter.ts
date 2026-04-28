import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "../../trpc"
import { Project, projectsResponseSchema } from "../types/models"

export const projectRouter = {
  /**
   * Get authenticated projects for a specific domain
   *
   * This endpoint supports two modes:
   * 1. Explicit domain_id in input (recommended for new code)
   * 2. Automatic extraction from token (backward compatibility)
   *
   * The domain_id determines which domain's projects are returned.
   * Token is automatically rescoped to the domain for proper authorization.
   */
  getAuthProjects: protectedProcedure
    .input(z.object({ domain_id: z.string().optional() }).optional())
    .query(async ({ ctx, input }): Promise<Project[] | undefined> => {
      // Extract domain_id from input or fallback to token
      const token = ctx.openstack?.getToken()
      const domainId = input?.domain_id || token?.tokenData?.project?.domain?.id || token?.tokenData?.user?.domain?.id

      if (!domainId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "domain_id is required either in input or token",
        })
      }

      // Rescope to the domain for proper authorization
      const openstackSession = await ctx.rescopeSession({ domainId })

      if (!openstackSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to scope session to domain. User may not have access to this domain.",
        })
      }

      const identityService = openstackSession.service("identity")
      const parsedData = projectsResponseSchema.safeParse(
        await identityService.get("auth/projects").then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.projects
    }),

  /**
   * Search projects within a specific domain with optional text filtering
   *
   * This endpoint supports two modes:
   * 1. Explicit domain_id in input (recommended for new code)
   * 2. Automatic extraction from token (backward compatibility)
   */
  searchProjects: protectedProcedure
    .input(
      z
        .object({
          domain_id: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }): Promise<Project[] | undefined> => {
      if (!ctx.openstack?.hasService("identity")) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Identity service is not available in the service catalog",
        })
      }

      // Extract domain_id from input or fallback to token
      const token = ctx.openstack.getToken()
      const domainId = input?.domain_id || token?.tokenData?.project?.domain?.id || token?.tokenData?.user?.domain?.id

      if (!domainId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "domain_id is required either in input or token",
        })
      }

      // Rescope to the domain for proper authorization
      const openstackSession = await ctx.rescopeSession({ domainId })

      if (!openstackSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to scope session to domain. User may not have access to this domain.",
        })
      }

      const identityService = openstackSession.service("identity")

      const parsedData = projectsResponseSchema.safeParse(
        await identityService.get("auth/projects").then((res) => res.json())
      )

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      let projects = parsedData.data.projects

      // Apply text search filter if provided
      if (input?.search && input.search.trim() !== "") {
        const searchTermLower = input.search.toLowerCase()
        projects = projects.filter(
          (project) =>
            project.name.toLowerCase().includes(searchTermLower) ||
            (project.description && project.description.toLowerCase().includes(searchTermLower))
        )
      }

      projects.sort((a, b) => a.name.localeCompare(b.name))

      return projects
    }),

  /**
   * Get project by ID
   *
   * DECISION: Remains as protectedProcedure (not domain-scoped or project-scoped)
   *
   * This procedure reads project metadata using the /projects/{id} endpoint.
   * According to OpenStack Identity API v3, this endpoint can be called with:
   * 1. An unscoped token (returns basic project info if user has any role on the project)
   * 2. A domain-scoped token (returns full info if user is domain admin)
   * 3. A project-scoped token (returns full info if scoped to the same project)
   *
   * Since we're just reading basic metadata and the user's initial token already
   * has visibility to projects they have access to, we don't need to rescope.
   * Rescoping would add unnecessary overhead and complexity.
   *
   * If in the future we need to access project-specific resources (compute, network, etc.),
   * we should create a separate procedure using projectScopedProcedure.
   */
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      const openstackSession = ctx.openstack

      const identityService = openstackSession?.service("identity")
      const parsedData = projectsResponseSchema.safeParse(
        await identityService?.get(`projects/${input.id}`).then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.projects.find((project: Project) => project.id === input.id)
    }),
}

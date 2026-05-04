import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "../../trpc"
import { Project, projectResponseSchema, projectsResponseSchema } from "../types/models"

/**
 * Helper function to call Identity API endpoints directly
 *
 * This is needed because unscoped/domain-scoped tokens don't have service catalog,
 * so we can't use openstackSession.service("identity") which relies on catalog lookup.
 *
 * Instead, we:
 * 1. Get the Identity endpoint directly from IDENTITY_ENDPOINT env var
 * 2. Make a direct HTTP call with the user's current auth token
 * 3. This works with ANY valid token type (unscoped, domain-scoped, project-scoped)
 *
 * Use this for /v3/auth/* endpoints (auth/projects, auth/domains) which are designed
 * to work without service catalog and return resources based on role assignments.
 *
 * @param authToken - The user's X-Auth-Token from their current session
 * @param path - The API path relative to /v3/ (e.g., "auth/projects")
 * @returns Promise<Response> - The fetch Response object
 * @throws TRPCError if IDENTITY_ENDPOINT is not configured or API call fails
 */
async function callIdentityAPI(authToken: string, path: string): Promise<Response> {
  const identityEndpoint = process.env.IDENTITY_ENDPOINT
  if (!identityEndpoint) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Identity endpoint not configured",
    })
  }

  // Ensure endpoint ends with /v3/
  const normalizedEndpoint = identityEndpoint.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`
  const endpoint = normalizedEndpoint.endsWith("/v3/") ? normalizedEndpoint : normalizedEndpoint.replace(/\/?$/, "/v3/")

  const response = await fetch(`${endpoint}${path}`, {
    method: "GET",
    headers: {
      "X-Auth-Token": authToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Identity API call failed: ${response.status} ${response.statusText}`,
    })
  }

  return response
}

export const projectRouter = {
  /**
   * Get authenticated projects
   *
   * Returns all projects that the authenticated user has access to,
   * across all domains. Uses the OpenStack /v3/auth/projects endpoint
   * which works with any valid token (unscoped, domain-scoped, or project-scoped).
   *
   * AUTHORIZATION FLOW:
   *
   * 1. This endpoint does NOT require project-scoping or domain-scoping.
   *    It works with the user's current token as-is and returns all projects
   *    where the user has ANY role assignment (member, admin, reader, etc.).
   *
   * 2. This is essentially a "navigation menu" - showing users which projects
   *    they can access. It does NOT check specific permissions within projects.
   *
   * 3. Actual permission checks happen later when accessing project resources:
   *    - User selects a project from the list
   *    - Frontend calls an endpoint with project_id (e.g., listServers)
   *    - projectScopedProcedure rescopes the token to that specific project
   *    - OpenStack service (Nova, Neutron, etc.) checks permissions via policy.json
   *    - User may have different roles/permissions in different projects
   *
   * TECHNICAL NOTES:
   * - We call Identity API directly via fetch (not via service catalog)
   *   because unscoped/domain-scoped tokens don't have service catalog
   * - No rescoping means faster response and works with any token type
   * - Keystone enforces access control based on role_assignments table
   */
  getAuthProjects: protectedProcedure.query(async ({ ctx }): Promise<Project[] | undefined> => {
    if (!ctx.openstack) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No authenticated session",
      })
    }

    const token = ctx.openstack.getToken()
    if (!token?.authToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No auth token available",
      })
    }

    const response = await callIdentityAPI(token.authToken, "auth/projects")
    const data = await response.json()
    const parsedData = projectsResponseSchema.safeParse(data)

    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }
    return parsedData.data.projects
  }),

  /**
   * Search projects with optional text filtering
   *
   * Returns all projects that the authenticated user has access to,
   * filtered by the optional search term. Uses the OpenStack /v3/auth/projects
   * endpoint which works with any valid token.
   */
  searchProjects: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }): Promise<Project[] | undefined> => {
      if (!ctx.openstack) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No authenticated session",
        })
      }

      const token = ctx.openstack.getToken()
      if (!token?.authToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No auth token available",
        })
      }

      const response = await callIdentityAPI(token.authToken, "auth/projects")
      const data = await response.json()
      const parsedData = projectsResponseSchema.safeParse(data)

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
   * IMPORTANT: This should be called AFTER rescoping the session to the target project
   * or a domain with admin privileges. Calling it with an unscoped or differently-scoped
   * token may result in 403 FORBIDDEN if the user doesn't have sufficient privileges.
   *
   * If in the future we need to access project-specific resources (compute, network, etc.),
   * we should create a separate procedure using projectScopedProcedure.
   */
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      const identityService = ctx.openstack?.service("identity")
      if (!ctx.openstack || !identityService) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Identity service unavailable",
        })
      }
      const parsedData = projectResponseSchema.safeParse(
        await identityService.get(`projects/${input.id}`).then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.project
    }),
}

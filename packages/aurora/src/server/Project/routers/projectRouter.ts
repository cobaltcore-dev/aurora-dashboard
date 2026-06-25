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
 * 1. Use the identity endpoint supplied via consumer config (createServer({ identityEndpoint }))
 * 2. Make a direct HTTP call with the user's current auth token
 * 3. This works with ANY valid token type (unscoped, domain-scoped, project-scoped)
 *
 * Use this for /v3/auth/* endpoints (auth/projects, auth/domains) which are designed
 * to work without service catalog and return resources based on role assignments.
 *
 * @param identityEndpoint - Normalised identity endpoint from ctx (always ends with /)
 * @param authToken - The user's X-Auth-Token from their current session
 * @param path - The API path relative to /v3/ (e.g., "auth/projects")
 * @returns Promise<Response> - The fetch Response object
 * @throws TRPCError if identity endpoint is not configured or API call fails
 */
async function callIdentityAPI(identityEndpoint: string, authToken: string, path: string): Promise<Response> {
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

    const [response, domainsResponse] = await Promise.all([
      callIdentityAPI(ctx.identityEndpoint, token.authToken, "auth/projects"),
      callIdentityAPI(ctx.identityEndpoint, token.authToken, "auth/domains").catch(() => null),
    ])

    const data = await response.json()
    const parsedData = projectsResponseSchema.safeParse(data)

    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.message)
      return undefined
    }

    const domainsData = domainsResponse ? await domainsResponse.json().catch(() => null) : null
    const domainsResponseSchema = z.object({ domains: z.array(z.object({ id: z.string(), name: z.string() })) })
    const parsedDomains = domainsResponseSchema.safeParse(domainsData)
    const domainMap = new Map<string, string>(
      (parsedDomains.success ? parsedDomains.data.domains : []).map((d) => [d.id, d.name])
    )

    return parsedData.data.projects.map((project) => ({
      ...project,
      domain_name: project.domain_id ? (domainMap.get(project.domain_id) ?? undefined) : undefined,
    }))
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

      const response = await callIdentityAPI(ctx.identityEndpoint, token.authToken, "auth/projects")
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

  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      if (!ctx.openstack) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No authenticated session" })
      }
      const token = ctx.openstack.getToken()
      if (!token?.authToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No auth token available" })
      }
      const response = await callIdentityAPI(ctx.identityEndpoint, token.authToken, `projects/${input.id}`)
      const parsed = projectResponseSchema.safeParse(await response.json())
      if (!parsed.success) {
        console.error("Zod Parsing Error:", parsed.error.message)
        return undefined
      }
      return parsed.data.project
    }),
}

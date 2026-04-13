import type { AuroraPortalContext } from "./context"
import { initTRPC, TRPCError } from "@trpc/server"
import { z } from "zod"

const t = initTRPC.context<AuroraPortalContext>().create()

export const router = t.router
export const auroraRouter = t.router
export const mergeRouters = t.mergeRouters
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

export const protectedProcedure = publicProcedure.use(async function isAuthenticated(opts) {
  if (opts.ctx.validateSession() === false) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "The session is invalid",
    })
  }
  return opts.next({
    ctx: opts.ctx,
  })
})

/**
 * Base input schema that all project-scoped procedures must extend
 * Ensures project_id is always present and validated
 */
export const projectScopedInputSchema = z.object({
  project_id: z.string().min(1, "project_id must be a non-empty string"),
})

/**
 * Base input schema that all domain-scoped procedures must extend
 * Ensures domain_id is always present and validated
 */
export const domainScopedInputSchema = z.object({
  domain_id: z.string().min(1, "domain_id must be a non-empty string"),
})

/**
 * Project-scoped procedure middleware
 *
 * Automatically handles OpenStack token rescoping to a specific project.
 * This middleware ensures that all subsequent API calls have the correct
 * project-scoped token, which is required for accessing project-level resources
 * like compute instances, networks, volumes, etc.
 *
 * Requirements:
 * - User must be authenticated (extends protectedProcedure)
 * - Input schema must extend projectScopedInputSchema
 *
 * Behavior:
 * - Rescopes the OpenStack session to the specified project using Keystone
 * - Caches the scoped token in a cookie to avoid unnecessary rescoping on subsequent requests
 * - Passes the rescoped session to downstream procedures via ctx.openstack
 *
 * Error handling:
 * - BAD_REQUEST: If project_id is missing or invalid (handled by Zod schema)
 * - UNAUTHORIZED: If token rescoping fails (e.g., invalid token, Keystone unavailable)
 * - FORBIDDEN: If user has no role assignment on the specified project
 *
 * Usage example:
 * ```ts
 * export const computeRouter = {
 *   listServers: projectScopedProcedure
 *     .input(projectScopedInputSchema.extend({ limit: z.number().optional() }))
 *     .query(async ({ ctx, input }) => {
 *       // Token is already rescoped to the project
 *       const compute = ctx.openstack.service("compute")
 *       return compute.servers.list()
 *     })
 * }
 * ```
 *
 * @important The procedure using this middleware MUST use projectScopedInputSchema or extend it
 */
export const projectScopedProcedure = protectedProcedure.use(async function rescopeToProject(opts) {
  const { ctx, next, getRawInput } = opts

  // Get the raw input before Zod parsing
  // This is available in tRPC v11 through getRawInput()
  const rawInput = await getRawInput()

  // Validate that project_id exists in the raw input (OpenStack uses snake_case)
  if (!rawInput || typeof rawInput !== "object" || !("project_id" in rawInput)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "project_id is required for project-scoped operations",
    })
  }

  const { project_id } = rawInput as { project_id: unknown }

  // Validate project_id is a non-empty string
  if (typeof project_id !== "string" || project_id.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "project_id must be a non-empty string",
    })
  }

  // Rescope the session to the specified project
  // This calls Keystone to get a new token scoped to the project
  // The token is automatically cached in a cookie by rescopeSession
  const openstackSession = await ctx.rescopeSession({ projectId: project_id })

  // If rescoping fails, it means either:
  // 1. The user's token is invalid (should be caught by protectedProcedure)
  // 2. The user doesn't have access to this project (no role assignment)
  if (!openstackSession) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Failed to scope session to project. User may not have access to this project.",
    })
  }

  // Pass the rescoped session to the next middleware/procedure
  return next({
    ctx: {
      ...ctx,
      openstack: openstackSession,
    },
  })
})

/**
 * Domain-scoped procedure middleware
 *
 * Automatically handles OpenStack token rescoping to a specific domain.
 * This middleware ensures that all subsequent API calls have the correct
 * domain-scoped token, which is required for accessing domain-level resources
 * and performing administrative operations like user management, project creation, etc.
 *
 * Requirements:
 * - User must be authenticated (extends protectedProcedure)
 * - User must have access to the requested domain (validated via lazy-loaded getUserInfo)
 * - Input schema must extend domainScopedInputSchema
 *
 * Behavior:
 * - Validates that domain_id is present in the input
 * - Lazy-loads user info (calls /v3/auth/domains) only when this procedure is invoked
 * - Verifies that the domain is in the user's available domains list
 * - Rescopes the OpenStack session to the specified domain using Keystone
 * - Keystone enforces permissions based on user's actual role assignments in that domain
 * - Caches the scoped token in a cookie to avoid unnecessary rescoping on subsequent requests
 * - Passes the rescoped session to downstream procedures via ctx.openstack
 *
 * Performance:
 * - User info is fetched lazily (only when domainScopedProcedure is used)
 * - This avoids unnecessary Keystone API calls for project-scoped or public procedures
 * - User info is cached per session to avoid repeated API calls
 *
 * Error handling:
 * - BAD_REQUEST: If domain_id is missing or invalid (handled by Zod schema)
 * - FORBIDDEN: If user lacks access to the requested domain
 * - UNAUTHORIZED: If token rescoping fails (e.g., invalid token, Keystone unavailable)
 *
 * Note: We don't check for specific role names (like "admin") because OpenStack roles
 * are configurable. Instead, we rely on Keystone to enforce permissions when rescoping.
 *
 * Usage example:
 * ```ts
 * export const identityRouter = {
 *   listUsers: domainScopedProcedure
 *     .input(domainScopedInputSchema.extend({ includeDisabled: z.boolean().optional() }))
 *     .query(async ({ ctx, input }) => {
 *       // Token is already rescoped to the domain
 *       // Keystone has validated user's permissions in this domain
 *       const identity = ctx.openstack.service("identity")
 *       return identity.users.list()
 *     })
 * }
 * ```
 *
 * @important The procedure using this middleware MUST use domainScopedInputSchema or extend it
 */
export const domainScopedProcedure = protectedProcedure.use(async function rescopeToDomain(opts) {
  const { ctx, next, getRawInput } = opts

  // Get the raw input before Zod parsing
  // This is available in tRPC v11 through getRawInput()
  const rawInput = await getRawInput()

  // Validate that domain_id exists in the raw input (OpenStack uses snake_case)
  if (!rawInput || typeof rawInput !== "object" || !("domain_id" in rawInput)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "domain_id is required for domain-scoped operations",
    })
  }

  const { domain_id } = rawInput as { domain_id: unknown }

  // Validate domain_id is a non-empty string
  if (typeof domain_id !== "string" || domain_id.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "domain_id must be a non-empty string",
    })
  }

  // Lazy-load user info to get list of accessible domains
  // This only happens for domain-scoped procedures, avoiding unnecessary Keystone calls
  // for project-scoped or public procedures
  const userInfo = ctx.getUserInfo ? await ctx.getUserInfo() : undefined

  // Verify that the user has access to the specific domain requested
  // We check the list of available domains from /v3/auth/domains
  // Actual permission enforcement happens in Keystone when we rescope
  const hasAccess = userInfo?.availableDomains?.some((domain: { id: string }) => domain.id === domain_id)
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied. User does not have access to domain ${domain_id}`,
    })
  }

  // Rescope the session to the specified domain
  // Keystone will enforce permissions based on the user's role assignments in that domain
  // The token is automatically cached in a cookie by rescopeSession
  const openstackSession = await ctx.rescopeSession({ domainId: domain_id })

  // If rescoping fails, it typically means:
  // 1. The user's token is invalid (should be caught by protectedProcedure)
  // 2. Keystone service is unavailable
  // 3. Internal error during token rescoping
  if (!openstackSession) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Failed to scope session to domain. Please try again or contact support.",
    })
  }

  // Pass the rescoped session to the next middleware/procedure
  return next({
    ctx: {
      ...ctx,
      openstack: openstackSession,
    },
  })
})

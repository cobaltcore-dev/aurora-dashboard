import type { AuroraPortalContext } from "./context"
import { initTRPC, TRPCError } from "@trpc/server"
import { z } from "zod"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"

const t = initTRPC.context<AuroraPortalContext>().create()

/**
 * Middleware that converts SignalOpenstackApiError to TRPCError with appropriate codes.
 * Applied to all procedures so callers don't need individual try/catch blocks.
 *
 * Note: In tRPC v11, next() returns a MiddlewareResult object with { ok: boolean, error?: TRPCError }
 * instead of throwing. We need to check result.ok and inspect result.error.cause for the original error.
 */
const openstackErrorMiddleware = t.middleware(async ({ next }) => {
  const result = await next()

  // In tRPC v11, errors don't throw - they're returned in the result object
  if (!result.ok) {
    const cause = result.error.cause

    // Check if the underlying cause is a SignalOpenstackApiError
    if (cause instanceof SignalOpenstackApiError) {
      if (cause.statusCode === 401) {
        return {
          ...result,
          error: new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session expired or invalid. Please log in again.",
            cause,
          }),
        }
      }
      if (cause.statusCode === 400) {
        return {
          ...result,
          error: new TRPCError({
            code: "BAD_REQUEST",
            message: "The OpenStack request was invalid.",
            cause,
          }),
        }
      }
      if (cause.statusCode === 404) {
        return {
          ...result,
          error: new TRPCError({
            code: "NOT_FOUND",
            message: "Resource not found or not accessible. This can happen if you switched domains in another tab.",
            cause,
          }),
        }
      }
      if (cause.statusCode === 403) {
        return {
          ...result,
          error: new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. You may not have the required role assignment.",
            cause,
          }),
        }
      }
      return {
        ...result,
        error: new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected OpenStack error occurred",
          cause,
        }),
      }
    }
  }

  return result
})

export const router = t.router
export const auroraRouter = t.router
export const mergeRouters = t.mergeRouters
export const publicProcedure = t.procedure.use(openstackErrorMiddleware)
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
  project_id: z.string().trim().min(1, "project_id must be a non-empty string"),
})

/**
 * Base input schema that all domain-scoped procedures must extend
 * Ensures domain_id is always present and validated
 */
export const domainScopedInputSchema = z.object({
  domain_id: z.string().trim().min(1, "domain_id must be a non-empty string"),
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
 * - Input is pre-validated with projectScopedInputSchema (base schema applied)
 * - Additional input fields can be added by extending the base schema
 *
 * Behavior:
 * - Validates project_id through Zod schema (no manual validation needed)
 * - Rescopes the OpenStack session to the specified project using Keystone
 * - Caches the scoped token in a cookie to avoid unnecessary rescoping on subsequent requests
 * - Passes the rescoped session to downstream procedures via ctx.openstack
 *
 * Error handling:
 * - BAD_REQUEST: If project_id is missing or invalid (handled by Zod schema)
 * - UNAUTHORIZED: If token rescoping fails, including when the session cannot be
 *   rescoped to the specified project (for example, due to an invalid token,
 *   Keystone unavailability, or missing role assignment on that project)
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
 * @important When extending the input schema, use projectScopedInputSchema.extend({ ... })
 */
export const projectScopedProcedure = protectedProcedure
  .input(projectScopedInputSchema)
  .use(async function rescopeToProject(opts) {
    const { ctx, next, input } = opts

    // project_id is guaranteed to exist and be a non-empty string
    // because it was validated by projectScopedInputSchema
    const { project_id } = input

    // Rescope the session to the specified project
    // This calls Keystone to get a new token scoped to the project
    // The token is automatically cached in a cookie by rescopeSession
    // Errors are handled by openstackErrorMiddleware
    const openstackSession = await ctx.rescopeSession({ projectId: project_id })

    // If rescoping returns null (no session), throw an error
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
        signal: ctx.signal,
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
 * - Input is pre-validated with domainScopedInputSchema (base schema applied)
 * - User must have access to the requested domain (validated via lazy-loaded getUserInfo)
 * - Additional input fields can be added by extending the base schema
 *
 * Behavior:
 * - Validates domain_id through Zod schema (no manual validation needed)
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
 * @important When extending the input schema, use domainScopedInputSchema.extend({ ... })
 */
export const domainScopedProcedure = protectedProcedure
  .input(domainScopedInputSchema)
  .use(async function rescopeToDomain(opts) {
    const { ctx, next, input } = opts

    // domain_id is guaranteed to exist and be a non-empty string
    // because it was validated by domainScopedInputSchema
    const { domain_id } = input

    // Lazy-load user info to get list of accessible domains
    // This only happens for domain-scoped procedures, avoiding unnecessary Keystone calls
    // for project-scoped or public procedures
    const userInfo = ctx.getUserInfo ? await ctx.getUserInfo() : undefined

    // If we couldn't fetch user info, it means either:
    // 1. Keystone service is unavailable (network/server error)
    // 2. Token is invalid (should be caught by protectedProcedure)
    // We treat this as an authorization failure since we can't verify access
    if (!userInfo) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Failed to verify domain access. Please try again or contact support.",
      })
    }

    // Verify that the user has access to the specific domain requested
    // We check the list of available domains from /v3/auth/domains
    // Actual permission enforcement happens in Keystone when we rescope
    const hasAccess = userInfo.availableDomains?.some((domain: { id: string }) => domain.id === domain_id)
    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. User does not have access to domain ${domain_id}`,
      })
    }

    // Rescope the session to the specified domain
    // Keystone will enforce permissions based on the user's role assignments in that domain
    // The token is automatically cached in a cookie by rescopeSession
    // Errors are handled by openstackErrorMiddleware
    const openstackSession = await ctx.rescopeSession({ domainId: domain_id })

    // If rescoping returns null (no session), throw an error
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
        signal: ctx.signal,
      },
    })
  })

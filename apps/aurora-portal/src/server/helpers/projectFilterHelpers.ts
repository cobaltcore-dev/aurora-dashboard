import { TRPCError } from "@trpc/server"
import type { AuroraPortalContext } from "@/server/context"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"

/**
 * Extracts the current project ID from the OpenStack session token.
 * This is used to enforce project-level data isolation in API queries.
 *
 * The project ID is extracted from the session token, which is the
 * authoritative source for the user's current project scope. This
 * prevents clients from requesting data from other projects.
 *
 * @param ctx - The tRPC context containing the OpenStack session
 * @returns The current project ID from the token
 * @throws TRPCError with code UNAUTHORIZED if:
 *   - No valid OpenStack session exists
 *   - Token is missing or invalid
 *   - Project ID cannot be determined from token (unscoped token)
 *
 * @example
 * const projectId = extractProjectIdFromToken(ctx)
 * queryParams.set('project_id', projectId)
 */
function extractProjectIdFromToken(ctx: AuroraPortalContext): string {
  const openstackSession = ctx.openstack

  if (!openstackSession) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No valid OpenStack session found",
    })
  }

  const token = openstackSession.getToken()

  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No valid OpenStack token found",
    })
  }

  const projectId = token.tokenData.project?.id

  if (!projectId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unable to determine current project ID from OpenStack token. The token may be unscoped or invalid.",
    })
  }

  return projectId
}

/**
 * Builds OpenStack query parameters with server-enforced project filtering.
 *
 * This helper automatically:
 * - Extracts project ID from the session token (server-authoritative)
 * - Ignores any client-provided project_id/tenant_id (zero-trust security)
 * - Removes BFF-only parameters (searchTerm)
 * - Adds server-enforced project_id to query parameters
 *
 * This ensures that all OpenStack API queries are properly scoped to the
 * current project, preventing cross-project data leakage.
 *
 * @param ctx - The tRPC context containing the OpenStack session
 * @param input - Client input (project_id/tenant_id will be ignored)
 * @param options - Optional keyMap for parameter name mapping (e.g., tags_any -> tags-any)
 * @returns URLSearchParams with project_id enforced
 *
 * @example
 * // In a router
 * const queryParams = buildProjectScopedQueryParams(ctx, input, {
 *   keyMap: { tags_any: "tags-any" }
 * })
 * const url = `v2.0/security-groups?${queryParams.toString()}`
 * // Result: v2.0/security-groups?project_id=abc-123&limit=50
 */
export function buildProjectScopedQueryParams(
  ctx: AuroraPortalContext,
  input: Record<string, unknown>,
  options?: { keyMap?: Record<string, string> }
): URLSearchParams {
  // Extract server-authoritative project ID from token
  const projectId = extractProjectIdFromToken(ctx)

  // Force server project ID into parameters
  const paramsWithProjectFilter = {
    ...input,
    project_id: projectId, // Server-enforced from token
  }

  // Build URLSearchParams with optional key mapping
  return appendQueryParamsFromObject(paramsWithProjectFilter, options)
}

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { loadPolicyEngine } from "./policyEngineLoader"
import { projectScopedProcedure, projectScopedInputSchema } from "../trpc"
import type { PolicyEngine } from "@cobaltcore-dev/policy-engine"

/**
 * Configuration for a single policy engine
 */
export interface EngineDef {
  fileName: string
}

/**
 * Mapping from a frontend permission key to an engine + OpenStack rule
 */
export interface PolicyMapping {
  engine: string
  rule: string
}

/**
 * Configuration for creating a permission router
 */
export interface ServicePolicyConfig<TMappings extends Record<string, PolicyMapping>> {
  policyDir: string
  engines: Record<string, EngineDef>
  mappings: TMappings
}

/**
 * Helper to get policy instance from context and engine
 */
const getPolicy = (ctx: AuroraPortalContext, engine: PolicyEngine) => {
  const openstackSession = ctx.openstack
  const token = openstackSession?.getToken()
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
  }

  return engine.policy(token.tokenData, {
    debug: true,
    defaultParams: { project_id: token.tokenData.project?.id },
  })
}

/**
 * Generic factory function to create a permission router for any service.
 *
 * This factory handles:
 * - Dynamic loading of policy engines from YAML files
 * - Type-safe permission key validation
 * - Single and bulk permission checks
 * - Consistent error handling across all services
 *
 * @template TMappings - The type of the policy mappings object
 * @param config - Configuration containing policyDir, engines, and mappings
 * @returns A tRPC router with a `canUser` procedure
 *
 * @example
 * ```typescript
 * const STORAGE_MAPPINGS = {
 *   "swift:container_list": { engine: "swift", rule: "object_storage:container_list" },
 *   "ceph:bucket_list": { engine: "ceph", rule: "object_storage:container_list" },
 * } as const
 *
 * export const buildStoragePermissionRouter = (policyDir: string) =>
 *   createPermissionRouter({
 *     policyDir,
 *     engines: {
 *       swift: { fileName: "swift.yaml" },
 *       ceph: { fileName: "ceph.yaml" },
 *     },
 *     mappings: STORAGE_MAPPINGS,
 *   })
 * ```
 */
export function createPermissionRouter<TMappings extends Record<string, PolicyMapping>>(
  config: ServicePolicyConfig<TMappings>
) {
  // Load all policy engines at router creation time
  const loadedEngines: Record<string, PolicyEngine> = Object.fromEntries(
    Object.entries(config.engines).map(([name, { fileName }]) => [name, loadPolicyEngine(fileName, config.policyDir)])
  )

  // Create Zod schema for validating permission keys
  const PERMISSION_KEY = z
    .string()
    .superRefine((value, ctx) => {
      if (!Object.hasOwn(config.mappings, value)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown permission: ${value}`,
        })
      }
    })
    .transform((value) => value as keyof TMappings)

  /**
   * Check a single permission for the current user
   */
  const checkSinglePermission = (
    ctx: AuroraPortalContext,
    permission: keyof TMappings,
    engines: Record<string, PolicyEngine>
  ): boolean => {
    const mapping = config.mappings[permission]
    const engine = engines[mapping.engine]

    if (!engine) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Policy engine '${mapping.engine}' not found for permission '${String(permission)}'`,
      })
    }

    const policy = getPolicy(ctx, engine)
    return policy.check(mapping.rule)
  }

  return {
    /**
     * Permission checking endpoint that determines whether a user has one or more specific permissions.
     *
     * Usage:
     * - `canUser({ project_id: "abc", permission: "servers:list" })` → returns `[boolean]`
     * - `canUser({ project_id: "abc", permission: ["servers:list", "flavors:create"] })` → returns `boolean[]`
     *
     * Input must be:
     * - A project_id (required, validated by projectScopedInputSchema), and
     * - A single valid permission key (string in mappings), or
     * - An array of valid permission keys.
     *
     * Invalid keys are rejected with a `BAD_REQUEST` error before the handler runs.
     * Empty array input returns an empty array (`[]`).
     * Always returns `boolean[]` for consistent destructuring on the client.
     */
    canUser: projectScopedProcedure
      .input(
        projectScopedInputSchema.extend({
          permission: z.union([PERMISSION_KEY, z.array(PERMISSION_KEY)]),
        })
      )
      .query(async ({ ctx, input }): Promise<boolean[]> => {
        const permissions = Array.isArray(input.permission) ? input.permission : [input.permission]

        if (permissions.length === 0) {
          return []
        }

        return permissions.map((permission) => checkSinglePermission(ctx, permission, loadedEngines))
      }),
  }
}

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { loadPolicyEngine } from "./policyEngineLoader"
import { projectScopedProcedure, projectScopedInputSchema } from "../trpc"
import type { PolicyEngine } from "@cobaltcore-dev/policy-engine"

/**
 * policy-engine's wording when a rule name isn't present in the loaded file and there is no
 * `_default` to fall back on (`policyEngine.ts`). Matched on the message because the engine
 * throws a plain `Error` and exposes no way to ask whether a rule exists.
 */
const MISSING_RULE_MESSAGE = /not found and no _default rule available/

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
 *       swift: { fileName: "swift.json" },
 *       ceph: { fileName: "ceph.json" },
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

  // Validate that all engines referenced in mappings are configured
  for (const [permissionKey, mapping] of Object.entries(config.mappings)) {
    if (!Object.hasOwn(loadedEngines, mapping.engine)) {
      throw new Error(
        `Configuration error: Permission '${permissionKey}' references engine '${mapping.engine}', ` +
          `but no such engine is configured. Available engines: ${Object.keys(loadedEngines).join(", ")}`
      )
    }
  }

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
   * Check a single permission for the current user.
   *
   * A rule that the loaded policy file doesn't define is answered with `false` for that one
   * key instead of failing the request. The engine throws in that case, and `canUser` below
   * evaluates every requested key through `.map`, so an uncaught throw would take down the
   * *entire* batch: for a caller like `useCephPermissions`, which asks for ~20 keys in one
   * call, a single missing rule would hide every action in the domain rather than the one it
   * actually governs. Fail-closed has to be per key.
   *
   * This is a legitimate deployment state, not only a mistake. `policyDir` is a consumer
   * supplied parameter of `createServer()`, so operators run their own policy files, and a
   * file written before a newly added key simply won't have that rule until they adopt it.
   * The denial is logged (at `warn`) so it stays diagnosable from the server side.
   *
   * Only that one failure is absorbed. Any other error out of `policy.check` — a malformed
   * rule expression, a bug in the evaluator — is rethrown: answering "no permission" would
   * turn a real fault into a plausible-looking UI with no signal anywhere.
   */
  const checkSinglePermission = (
    ctx: AuroraPortalContext,
    permission: keyof TMappings,
    engines: Record<string, PolicyEngine>
  ): boolean => {
    const mapping = config.mappings[permission]
    const engine = engines[mapping.engine]

    // Engine existence is validated at router creation time, so this should never happen
    if (!engine) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Policy engine '${mapping.engine}' not found for permission '${String(permission)}'`,
      })
    }

    const policy = getPolicy(ctx, engine)
    try {
      return policy.check(mapping.rule)
    } catch (error) {
      if (error instanceof Error && MISSING_RULE_MESSAGE.test(error.message)) {
        // `warn`, not `error`: the docblock above calls this a legitimate deployment state, and a
        // caller like `useCephPermissions` asks for ~20 keys per page load, so an operator one
        // rule behind would otherwise produce an error-level line on every page view. Matches how
        // the codebase already logs expected-but-notable states (`s3ErrorMapper`'s unmapped-code
        // fallback, `context.ts`'s missing-catalog warning).
        console.warn(
          `Permission '${String(permission)}' denied: rule '${mapping.rule}' is not defined in the loaded policy file, which also has no '_default' rule.`
        )
        return false
      }
      throw error
    }
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
     * A key whose rule is missing from the loaded policy file (and that file has no `_default`
     * rule) evaluates to `false` for that key alone — the rest of the batch is unaffected.
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

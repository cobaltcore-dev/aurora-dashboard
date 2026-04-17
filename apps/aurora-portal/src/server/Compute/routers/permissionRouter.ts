import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { loadPolicyEngine } from "@/server/policyEngineLoader"
import { protectedProcedure } from "../../trpc"

const computePolicyEngine = loadPolicyEngine("compute.yaml")
const imagePolicyEngine = loadPolicyEngine("image.yaml")

const getPolicy = (ctx: AuroraPortalContext, policyEngineName: "compute" | "image") => {
  const openstackSession = ctx.openstack
  const token = openstackSession?.getToken()
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
  }
  const policyEngine = policyEngineName === "compute" ? computePolicyEngine : imagePolicyEngine

  return policyEngine.policy(token.tokenData, {
    debug: true,
    defaultParams: { project_id: token.tokenData.project?.id },
  })
}

const POLICY_MAPPINGS = {
  // Servers
  "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
  "servers:create": { engine: "compute", rule: "os_compute_api:servers:create" },
  "servers:delete": { engine: "compute", rule: "os_compute_api:servers:delete" },
  "servers:update": { engine: "compute", rule: "os_compute_api:servers:update" },

  // Flavors
  "flavors:create": { engine: "compute", rule: "os_compute_api:os-flavor-manage:create" },
  "flavors:delete": { engine: "compute", rule: "os_compute_api:os-flavor-manage:delete" },
  "flavors:update": { engine: "compute", rule: "os_compute_api:os-flavor-manage:update" },
  "flavors:list_projects": { engine: "compute", rule: "os_compute_api:os-flavor-access" },
  "flavors:add_project": { engine: "compute", rule: "os_compute_api:os-flavor-access:add_tenant_access" },
  "flavors:remove_project": { engine: "compute", rule: "os_compute_api:os-flavor-access:remove_tenant_access" },

  // Flavor Specs
  "flavor_specs:list": { engine: "compute", rule: "os_compute_api:os-flavor-extra-specs:index" },
  "flavor_specs:create": { engine: "compute", rule: "os_compute_api:os-flavor-extra-specs:create" },
  "flavor_specs:update": { engine: "compute", rule: "os_compute_api:os-flavor-extra-specs:update" },
  "flavor_specs:delete": { engine: "compute", rule: "os_compute_api:os-flavor-extra-specs:delete" },

  // Images
  "images:list": { engine: "image", rule: "get_images" },
  "images:create": { engine: "image", rule: "add_image" },
  "images:delete": { engine: "image", rule: "delete_image" },
  "images:update": { engine: "image", rule: "modify_image" },
  "images:create_member": { engine: "image", rule: "add_member" },
  "images:delete_member": { engine: "image", rule: "delete_member" },
  "images:update_member": { engine: "image", rule: "modify_member" },
} as const

type PolicyKey = keyof typeof POLICY_MAPPINGS

const checkSinglePermission = (ctx: AuroraPortalContext, permission: PolicyKey) => {
  const policyMapping = POLICY_MAPPINGS[permission]
  const policy = getPolicy(ctx, policyMapping.engine)
  return policy.check(policyMapping.rule)
}

/**
 * Zod schema for a valid permission key.
 *
 * This schema ensures that:
 * - The value is a string.
 * - The string is a known key in `POLICY_MAPPINGS` (e.g., "servers:list", "flavors:create").
 *
 * Any other string or non‑string input is rejected as invalid,
 * resulting in a `BAD_REQUEST` error from tRPC before the handler runs.
 * This approach is explicit and tightly coupled to the defined policy mappings.
 *
 * @type {import("zod").ZodType<PolicyKey>}
 */
const PERMISSION_KEY = z.custom<PolicyKey>((value) => {
  if (typeof value !== "string" || !Object.hasOwn(POLICY_MAPPINGS, value)) {
    return false
  }
  return true
})

/**
 * Permission checking endpoint that determines whether a user has one or more specific permissions.
 *
 * Usage:
 * - `canUser("servers:list")` → returns `[boolean]` (single permission check, always wrapped in array).
 * - `canUser(["servers:list", "flavors:create"])` → returns `boolean[]` (bulk check, one result per permission in order).
 *
 * Input must be:
 * - A single valid permission key (string in `POLICY_MAPPINGS`), or
 * - An array of valid permission keys.
 *
 * Invalid keys or non‑string values are rejected with a `BAD_REQUEST` error before the handler runs.
 * Empty array input returns an empty array (`[]`).
 * Always returns `boolean[]` for consistent destructuring on the client.
 */
export const permissionRouter = {
  canUser: protectedProcedure
    .input(z.union([PERMISSION_KEY, z.array(PERMISSION_KEY)]))
    .query(async ({ ctx, input }): Promise<boolean[]> => {
      const permissions = typeof input === "string" ? [input] : input

      if (permissions.length === 0) {
        return []
      }

      return permissions.map((permission) => checkSinglePermission(ctx, permission))
    }),
}

import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { protectedProcedure } from "../../trpc"
import { loadPolicyEngine } from "@/server/policyEngineLoader"
import { z } from "zod"

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

// Helper function to validate a single permission
const validatePermission = (permission: string): PolicyKey => {
  const policyMapping = POLICY_MAPPINGS[permission as PolicyKey]
  if (!policyMapping) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown permission: ${permission}`,
    })
  }
  return permission as PolicyKey
}

// Helper function to check a single permission
const checkSinglePermission = (ctx: AuroraPortalContext, permission: PolicyKey): boolean => {
  const policyMapping = POLICY_MAPPINGS[permission]
  const policy = getPolicy(ctx, policyMapping.engine)
  return policy.check(policyMapping.rule)
}

export const permissionRouter = {
  canUser: protectedProcedure.input(z.string()).query(async ({ ctx, input }): Promise<boolean> => {
    const validatedPermission = validatePermission(input)
    return checkSinglePermission(ctx, validatedPermission)
  }),

  canUserBulk: protectedProcedure.input(z.array(z.string())).query(async ({ ctx, input }): Promise<boolean[]> => {
    // Return empty array for empty input
    if (input.length === 0) {
      return []
    }

    // Validate all permissions first (fail fast on invalid permissions)
    const validatedPermissions = input.map((permission) => validatePermission(permission))

    // Check all permissions and return results in the same order
    const results: boolean[] = validatedPermissions.map((permission) => checkSinglePermission(ctx, permission))

    return results
  }),
}

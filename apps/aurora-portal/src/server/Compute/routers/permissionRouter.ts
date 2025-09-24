import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "@/server/context"
import { protectedProcedure } from "../../trpc"
import { loadPolicyEngine } from "@/server/policyEngineLoader"
import { z } from "zod"

const computePolicyEngine = loadPolicyEngine("compute.yaml")
const imagePolicyEngine = loadPolicyEngine("image.yaml")

const getPolicy = (ctx: AuroraPortalContext, policyEngineName: "compute" | "image") => {
  const openstaSession = ctx.openstack
  const token = openstaSession?.getToken()
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
  }
  const policyEngine = policyEngineName === "compute" ? computePolicyEngine : imagePolicyEngine

  return policyEngine.policy(token.tokenData, {
    debug: false,
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
} as const

type PolicyKey = keyof typeof POLICY_MAPPINGS

export const permissionRouter = {
  canUser: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const policyMapping = POLICY_MAPPINGS[input as PolicyKey]

    if (!policyMapping) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown permission: ${input}`,
      })
    }

    const policy = getPolicy(ctx, policyMapping.engine)
    return policy.check(policyMapping.rule)
  }),
}

import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Compute and Image services.
 *
 * Maps frontend permission keys to OpenStack policy rules.
 * Format: "service:action" → { engine: "service", rule: "openstack_policy_rule" }
 */
const COMPUTE_IMAGE_MAPPINGS = {
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

/**
 * Creates a permission router for Compute and Image services.
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against OpenStack Compute (Nova) and Image (Glance) policy rules.
 *
 * @param policyDir - Absolute path to the directory containing policy YAML files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Check single permission
 * const [canList] = await trpc.compute.canUser.query({
 *   project_id: "abc123",
 *   permission: "servers:list"
 * })
 *
 * // Check multiple permissions
 * const [canList, canCreate, canDelete] = await trpc.compute.canUser.query({
 *   project_id: "abc123",
 *   permission: ["servers:list", "servers:create", "servers:delete"]
 * })
 * ```
 */
export const buildPermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      compute: { fileName: "compute.json" },
      image: { fileName: "image.json" },
    },
    mappings: COMPUTE_IMAGE_MAPPINGS,
  })

import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Network (Neutron) services.
 *
 * Maps frontend permission keys to OpenStack Neutron policy rules.
 * Format: "resource:action" → { engine: "network", rule: "openstack_policy_rule" }
 *
 * This covers core networking operations:
 * - Networks & Subnets
 * - Routers & Router Interfaces
 * - Floating IPs
 * - Security Groups & Rules
 * - Ports
 * - RBAC Policies
 */
const NETWORK_MAPPINGS = {
  // Networks
  "networks:create": { engine: "network", rule: "create_network" },
  "networks:get": { engine: "network", rule: "get_network" },
  "networks:update": { engine: "network", rule: "update_network" },
  "networks:delete": { engine: "network", rule: "delete_network" },

  // Subnets
  "subnets:create": { engine: "network", rule: "create_subnet" },
  "subnets:get": { engine: "network", rule: "get_subnet" },
  "subnets:update": { engine: "network", rule: "update_subnet" },
  "subnets:delete": { engine: "network", rule: "delete_subnet" },

  // Subnetpools
  "subnetpools:create": { engine: "network", rule: "create_subnetpool" },
  "subnetpools:get": { engine: "network", rule: "get_subnetpool" },
  "subnetpools:update": { engine: "network", rule: "update_subnetpool" },
  "subnetpools:delete": { engine: "network", rule: "delete_subnetpool" },

  // Routers
  "routers:create": { engine: "network", rule: "create_router" },
  "routers:get": { engine: "network", rule: "get_router" },
  "routers:update": { engine: "network", rule: "update_router" },
  "routers:delete": { engine: "network", rule: "delete_router" },
  "routers:add_interface": { engine: "network", rule: "add_router_interface" },
  "routers:remove_interface": { engine: "network", rule: "remove_router_interface" },

  // Floating IPs
  "floatingips:create": { engine: "network", rule: "create_floatingip" },
  "floatingips:get": { engine: "network", rule: "get_floatingip" },
  "floatingips:update": { engine: "network", rule: "update_floatingip" },
  "floatingips:delete": { engine: "network", rule: "delete_floatingip" },

  // Security Groups
  "security_groups:create": { engine: "network", rule: "create_security_group" },
  "security_groups:get": { engine: "network", rule: "get_security_group" },
  "security_groups:list": { engine: "network", rule: "get_security_groups" },
  "security_groups:update": { engine: "network", rule: "update_security_group" },
  "security_groups:delete": { engine: "network", rule: "delete_security_group" },

  // Security Group Rules
  "security_group_rules:create": { engine: "network", rule: "create_security_group_rule" },
  "security_group_rules:get": { engine: "network", rule: "get_security_group_rule" },
  "security_group_rules:list": { engine: "network", rule: "get_security_group_rules" },
  "security_group_rules:update": { engine: "network", rule: "update_security_group_rule" },
  "security_group_rules:delete": { engine: "network", rule: "delete_security_group_rule" },

  // Ports
  "ports:create": { engine: "network", rule: "create_port" },
  "ports:get": { engine: "network", rule: "get_port" },
  "ports:update": { engine: "network", rule: "update_port" },
  "ports:delete": { engine: "network", rule: "delete_port" },

  // RBAC Policies
  "rbac_policies:create": { engine: "network", rule: "create_rbac_policy" },
  "rbac_policies:get": { engine: "network", rule: "get_rbac_policy" },
  "rbac_policies:update": { engine: "network", rule: "update_rbac_policy" },
  "rbac_policies:delete": { engine: "network", rule: "delete_rbac_policy" },
} as const

/**
 * Creates a permission router for Network (Neutron) services.
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against OpenStack Neutron policy rules.
 *
 * @param policyDir - Absolute path to the directory containing policy YAML files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Check network creation permission
 * const [canCreate] = await trpc.network.canUser.query({
 *   project_id: "abc123",
 *   permission: "networks:create"
 * })
 *
 * // Check multiple permissions
 * const [canCreateNet, canCreateSubnet, canCreateRouter] = await trpc.network.canUser.query({
 *   project_id: "abc123",
 *   permission: ["networks:create", "subnets:create", "routers:create"]
 * })
 * ```
 */
export const buildNetworkPermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      network: { fileName: "networking.yaml" },
    },
    mappings: NETWORK_MAPPINGS,
  })

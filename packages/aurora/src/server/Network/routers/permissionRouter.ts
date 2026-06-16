import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Network (Neutron) services.
 *
 * Maps frontend permission keys to OpenStack Neutron policy rules using the pattern:
 * `network:resource:action`
 *
 * Design principles:
 * - Scope: "network" (consistent with other services)
 * - Resource: Domain language (networks, subnets, routers, ports, etc.)
 * - Action: CRUD verbs + specific operations (read, create, update, delete, attach, detach)
 *
 * This decouples the UI from OpenStack-specific terminology and allows for
 * consistent permission checking across the application.
 */
const NETWORK_MAPPINGS = {
  // Network Operations
  "network:networks:read": { engine: "network", rule: "get_network" },
  "network:networks:list": { engine: "network", rule: "get_network" },
  "network:networks:create": { engine: "network", rule: "create_network" },
  "network:networks:update": { engine: "network", rule: "update_network" },
  "network:networks:delete": { engine: "network", rule: "delete_network" },

  // Subnet Operations
  "network:subnets:read": { engine: "network", rule: "get_subnet" },
  "network:subnets:list": { engine: "network", rule: "get_subnet" },
  "network:subnets:create": { engine: "network", rule: "create_subnet" },
  "network:subnets:update": { engine: "network", rule: "update_subnet" },
  "network:subnets:delete": { engine: "network", rule: "delete_subnet" },

  // Subnet Pool Operations
  "network:subnet_pools:read": { engine: "network", rule: "get_subnetpool" },
  "network:subnet_pools:list": { engine: "network", rule: "get_subnetpool" },
  "network:subnet_pools:create": { engine: "network", rule: "create_subnetpool" },
  "network:subnet_pools:update": { engine: "network", rule: "update_subnetpool" },
  "network:subnet_pools:delete": { engine: "network", rule: "delete_subnetpool" },

  // Router Operations
  "network:routers:read": { engine: "network", rule: "get_router" },
  "network:routers:list": { engine: "network", rule: "get_router" },
  "network:routers:create": { engine: "network", rule: "create_router" },
  "network:routers:update": { engine: "network", rule: "update_router" },
  "network:routers:delete": { engine: "network", rule: "delete_router" },
  "network:routers:attach_interface": { engine: "network", rule: "add_router_interface" },
  "network:routers:detach_interface": { engine: "network", rule: "remove_router_interface" },

  // Floating IP Operations
  "network:floatingips:read": { engine: "network", rule: "get_floatingip" },
  "network:floatingips:list": { engine: "network", rule: "get_floatingip" },
  "network:floatingips:create": { engine: "network", rule: "create_floatingip" },
  "network:floatingips:update": { engine: "network", rule: "update_floatingip" },
  "network:floatingips:delete": { engine: "network", rule: "delete_floatingip" },
  "network:floatingips:associate": { engine: "network", rule: "update_floatingip" },
  "network:floatingips:disassociate": { engine: "network", rule: "update_floatingip" },

  // Security Group Operations
  "network:security_groups:read": { engine: "network", rule: "get_security_group" },
  "network:security_groups:list": { engine: "network", rule: "get_security_groups" },
  "network:security_groups:create": { engine: "network", rule: "create_security_group" },
  "network:security_groups:update": { engine: "network", rule: "update_security_group" },
  "network:security_groups:delete": { engine: "network", rule: "delete_security_group" },

  // Security Group Rule Operations
  "network:security_group_rules:read": { engine: "network", rule: "get_security_group_rule" },
  "network:security_group_rules:list": { engine: "network", rule: "get_security_group_rules" },
  "network:security_group_rules:create": { engine: "network", rule: "create_security_group_rule" },
  "network:security_group_rules:update": { engine: "network", rule: "update_security_group_rule" },
  "network:security_group_rules:delete": { engine: "network", rule: "delete_security_group_rule" },

  // Port Operations
  "network:ports:read": { engine: "network", rule: "get_port" },
  "network:ports:list": { engine: "network", rule: "get_port" },
  "network:ports:create": { engine: "network", rule: "create_port" },
  "network:ports:update": { engine: "network", rule: "update_port" },
  "network:ports:delete": { engine: "network", rule: "delete_port" },

  // RBAC Policy Operations
  "network:rbac_policies:read": { engine: "network", rule: "get_rbac_policy" },
  "network:rbac_policies:list": { engine: "network", rule: "get_rbac_policy" },
  "network:rbac_policies:create": { engine: "network", rule: "create_rbac_policy" },
  "network:rbac_policies:update": { engine: "network", rule: "update_rbac_policy" },
  "network:rbac_policies:delete": { engine: "network", rule: "delete_rbac_policy" },
} as const

/**
 * Creates a permission router for Network (Neutron) services.
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against OpenStack Neutron policy rules using a consistent, UI-friendly API.
 *
 * @param policyDir - Absolute path to the directory containing policy YAML files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Check network creation permission
 * const [canCreate] = await trpc.network.canUser.query({
 *   project_id: "abc123",
 *   permission: "network:networks:create"
 * })
 *
 * // Check multiple permissions
 * const [canCreateNet, canCreateSubnet, canCreateRouter] = await trpc.network.canUser.query({
 *   project_id: "abc123",
 *   permission: [
 *     "network:networks:create",
 *     "network:subnets:create",
 *     "network:routers:create"
 *   ]
 * })
 *
 * // Check floating IP operations
 * const [canCreate, canAssociate] = await trpc.network.canUser.query({
 *   project_id: "abc123",
 *   permission: [
 *     "network:floatingips:create",
 *     "network:floatingips:associate"
 *   ]
 * })
 * ```
 *
 * @remarks
 * Permission keys follow the pattern `network:resource:action` to:
 * - Decouple UI from OpenStack-specific terminology
 * - Provide consistent verb usage across all services (read, create, update, delete)
 * - Allow for future extensibility (e.g., different networking backends)
 *
 * Resources use domain-friendly names:
 * - `floatingips` instead of "floating IPs" for consistency
 * - `security_groups` instead of "secgroups" for clarity
 * - `subnet_pools` instead of "subnetpools" for readability
 */
export const buildNetworkPermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      network: { fileName: "networking.json" },
    },
    mappings: NETWORK_MAPPINGS,
  })

import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Object Storage services (Swift + Ceph).
 *
 * Maps frontend permission keys to OpenStack policy rules using the pattern:
 * `storage:resource:action`
 *
 * Design principles:
 * - Scope: "storage" (not "swift" or "ceph" - backend-agnostic)
 * - Resource: "containers", "objects", "folders" (domain language)
 * - Action: CRUD verbs (read, create, update, delete, manage)
 *
 * Both Swift and Ceph use the same permission keys but may load from
 * different policy files (swift.yaml, ceph.yaml) to allow independent customization.
 */
const STORAGE_MAPPINGS = {
  // Container Operations
  "storage:containers:read": { engine: "swift", rule: "object_storage:container_get" },
  "storage:containers:list": { engine: "swift", rule: "object_storage:container_list" },
  "storage:containers:create": { engine: "swift", rule: "object_storage:container_create" },
  "storage:containers:update": { engine: "swift", rule: "object_storage:container_update" },
  "storage:containers:delete": { engine: "swift", rule: "object_storage:container_delete" },
  "storage:containers:empty": { engine: "swift", rule: "object_storage:container_empty" },
  "storage:containers:manage_acls": { engine: "swift", rule: "object_storage:container_check_acls" },
  "storage:containers:read_acls": { engine: "swift", rule: "object_storage:container_show_access_control" },
  "storage:containers:update_acls": { engine: "swift", rule: "object_storage:container_update_access_control" },

  // Object Operations
  "storage:objects:read": { engine: "swift", rule: "object_storage:object_get" },
  "storage:objects:list": { engine: "swift", rule: "object_storage:object_list" },
  "storage:objects:download": { engine: "swift", rule: "object_storage:object_download" },
  "storage:objects:create": { engine: "swift", rule: "object_storage:object_update" },
  "storage:objects:update": { engine: "swift", rule: "object_storage:object_update" },
  "storage:objects:delete": { engine: "swift", rule: "object_storage:object_delete" },
  "storage:objects:copy": { engine: "swift", rule: "object_storage:object_create_copy" },
  "storage:objects:move": { engine: "swift", rule: "object_storage:object_move" },

  // Folder Operations
  "storage:folders:create_object": { engine: "swift", rule: "object_storage:folder_create_object" },
  "storage:folders:create": { engine: "swift", rule: "object_storage:folder_create_folder" },
  "storage:folders:delete": { engine: "swift", rule: "object_storage:folder_delete" },
} as const

/**
 * Creates a permission router for Object Storage services (Swift + Ceph).
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against object storage policy rules in a backend-agnostic way.
 *
 * @param policyDir - Absolute path to the directory containing policy YAML files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Check container permissions (works for both Swift and Ceph)
 * const [canList, canCreate] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["storage:containers:list", "storage:containers:create"]
 * })
 *
 * // Check object operations
 * const [canUpload, canDelete] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["storage:objects:create", "storage:objects:delete"]
 * })
 * ```
 *
 * @remarks
 * Permission keys use the pattern `storage:resource:action` to decouple the UI
 * from specific backend implementations (Swift vs Ceph). The backend selection
 * happens via policy file configuration (swift.yaml or ceph.yaml).
 *
 * Future enhancement: Support runtime backend selection by accepting
 * an engine parameter and mapping to the appropriate policy file.
 */
export const buildStoragePermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      swift: { fileName: "swift.yaml" },
      ceph: { fileName: "ceph.yaml" },
    },
    mappings: STORAGE_MAPPINGS,
  })

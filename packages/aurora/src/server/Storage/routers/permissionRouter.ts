import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Object Storage services.
 *
 * Uses unified Swift terminology (containers, objects, folders) for both Swift and Ceph backends.
 * The same permission keys work for both backends via a single storage policy engine.
 *
 * Design principles:
 * - Scope: "storage" (object storage service)
 * - Resource: Swift terminology (containers, objects, folders)
 * - Action: CRUD verbs (read, create, update, delete, manage)
 *
 * Pattern: `storage:resource:action`
 */
const STORAGE_MAPPINGS = {
  // Container Operations (works for both Swift containers and Ceph buckets)
  "storage:containers:read": { engine: "storage", rule: "storage:container_get" },
  "storage:containers:list": { engine: "storage", rule: "storage:container_list" },
  "storage:containers:create": { engine: "storage", rule: "storage:container_create" },
  "storage:containers:update": { engine: "storage", rule: "storage:container_update" },
  "storage:containers:delete": { engine: "storage", rule: "storage:container_delete" },
  "storage:containers:empty": { engine: "storage", rule: "storage:container_empty" },
  "storage:containers:manage_acls": { engine: "storage", rule: "storage:container_check_acls" },
  "storage:containers:read_acls": { engine: "storage", rule: "storage:container_show_access_control" },
  "storage:containers:update_acls": { engine: "storage", rule: "storage:container_update_access_control" },

  // Object Operations
  "storage:objects:read": { engine: "storage", rule: "storage:object_get" },
  "storage:objects:list": { engine: "storage", rule: "storage:object_list" },
  "storage:objects:download": { engine: "storage", rule: "storage:object_download" },
  "storage:objects:create": { engine: "storage", rule: "storage:object_update" },
  "storage:objects:update": { engine: "storage", rule: "storage:object_update" },
  "storage:objects:delete": { engine: "storage", rule: "storage:object_delete" },
  "storage:objects:copy": { engine: "storage", rule: "storage:object_create_copy" },
  "storage:objects:move": { engine: "storage", rule: "storage:object_move" },

  // Folder Operations
  "storage:folders:create_object": { engine: "storage", rule: "storage:folder_create_object" },
  "storage:folders:create": { engine: "storage", rule: "storage:folder_create_folder" },
  "storage:folders:delete": { engine: "storage", rule: "storage:folder_delete" },
} as const

/**
 * Creates a permission router for Object Storage services (Swift + Ceph).
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against object storage policy rules in a backend-agnostic way using unified
 * Swift terminology.
 *
 * @param policyDir - Absolute path to the directory containing policy JSON files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Container permissions (works for both Swift and Ceph)
 * const [canList, canCreate] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["storage:containers:list", "storage:containers:create"]
 * })
 *
 * // Object operations
 * const [canUpload] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: "storage:objects:create"
 * })
 * ```
 *
 * @remarks
 * Uses Swift terminology (containers instead of buckets) for consistency.
 * The same permission keys work for both Swift and Ceph S3 backends.
 */
export const buildStoragePermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      storage: { fileName: "storage.json" },
    },
    mappings: STORAGE_MAPPINGS,
  })

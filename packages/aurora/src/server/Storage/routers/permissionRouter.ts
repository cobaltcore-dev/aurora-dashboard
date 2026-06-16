import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Object Storage services (Swift + Ceph).
 *
 * Maps frontend permission keys to backend-specific policy rules using the pattern:
 * `storage:resource:action`
 *
 * Design principles:
 * - Scope: "storage" (not "swift" or "ceph" - backend-agnostic UI layer)
 * - Resource: "containers", "objects", "folders" (unified domain language)
 * - Action: CRUD verbs (read, create, update, delete, manage)
 *
 * Swift uses "containers" terminology, Ceph uses "buckets" terminology in policies,
 * but the UI sees a unified "storage:containers:*" interface.
 */
const STORAGE_MAPPINGS = {
  // Container Operations - Swift terminology
  "storage:containers:read": { engine: "swift", rule: "swift:container_get" },
  "storage:containers:list": { engine: "swift", rule: "swift:container_list" },
  "storage:containers:create": { engine: "swift", rule: "swift:container_create" },
  "storage:containers:update": { engine: "swift", rule: "swift:container_update" },
  "storage:containers:delete": { engine: "swift", rule: "swift:container_delete" },
  "storage:containers:empty": { engine: "swift", rule: "swift:container_empty" },
  "storage:containers:manage_acls": { engine: "swift", rule: "swift:container_check_acls" },
  "storage:containers:read_acls": { engine: "swift", rule: "swift:container_show_access_control" },
  "storage:containers:update_acls": { engine: "swift", rule: "swift:container_update_access_control" },

  // Object Operations - Swift
  "storage:objects:read": { engine: "swift", rule: "swift:object_get" },
  "storage:objects:list": { engine: "swift", rule: "swift:object_list" },
  "storage:objects:download": { engine: "swift", rule: "swift:object_download" },
  "storage:objects:create": { engine: "swift", rule: "swift:object_update" },
  "storage:objects:update": { engine: "swift", rule: "swift:object_update" },
  "storage:objects:delete": { engine: "swift", rule: "swift:object_delete" },
  "storage:objects:copy": { engine: "swift", rule: "swift:object_create_copy" },
  "storage:objects:move": { engine: "swift", rule: "swift:object_move" },

  // Folder Operations - Swift
  "storage:folders:create_object": { engine: "swift", rule: "swift:folder_create_object" },
  "storage:folders:create": { engine: "swift", rule: "swift:folder_create_folder" },
  "storage:folders:delete": { engine: "swift", rule: "swift:folder_delete" },

  // Bucket Operations - Ceph S3 terminology (maps to same UI as containers)
  "storage:buckets:read": { engine: "ceph", rule: "ceph:bucket_get" },
  "storage:buckets:list": { engine: "ceph", rule: "ceph:bucket_list" },
  "storage:buckets:create": { engine: "ceph", rule: "ceph:bucket_create" },
  "storage:buckets:update": { engine: "ceph", rule: "ceph:bucket_update" },
  "storage:buckets:delete": { engine: "ceph", rule: "ceph:bucket_delete" },
  "storage:buckets:empty": { engine: "ceph", rule: "ceph:bucket_empty" },
  "storage:buckets:manage_acls": { engine: "ceph", rule: "ceph:bucket_check_acls" },
  "storage:buckets:read_acls": { engine: "ceph", rule: "ceph:bucket_show_access_control" },
  "storage:buckets:update_acls": { engine: "ceph", rule: "ceph:bucket_update_access_control" },

  // Ceph Object Operations
  "storage:ceph_objects:read": { engine: "ceph", rule: "ceph:object_get" },
  "storage:ceph_objects:list": { engine: "ceph", rule: "ceph:object_list" },
  "storage:ceph_objects:download": { engine: "ceph", rule: "ceph:object_download" },
  "storage:ceph_objects:create": { engine: "ceph", rule: "ceph:object_update" },
  "storage:ceph_objects:update": { engine: "ceph", rule: "ceph:object_update" },
  "storage:ceph_objects:delete": { engine: "ceph", rule: "ceph:object_delete" },
  "storage:ceph_objects:copy": { engine: "ceph", rule: "ceph:object_create_copy" },
  "storage:ceph_objects:move": { engine: "ceph", rule: "ceph:object_move" },

  // Ceph Folder/Prefix Operations
  "storage:ceph_folders:create_object": { engine: "ceph", rule: "ceph:folder_create_object" },
  "storage:ceph_folders:create": { engine: "ceph", rule: "ceph:folder_create_folder" },
  "storage:ceph_folders:delete": { engine: "ceph", rule: "ceph:folder_delete" },
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
 * // Swift Container permissions
 * const [canList, canCreate] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["storage:containers:list", "storage:containers:create"]
 * })
 *
 * // Ceph S3 Bucket permissions
 * const [canList, canCreate] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["storage:buckets:list", "storage:buckets:create"]
 * })
 *
 * // Object operations work for both backends
 * const [swiftUpload] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: "storage:objects:create"  // Swift
 * })
 *
 * const [cephUpload] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: "storage:ceph_objects:create"  // Ceph
 * })
 * ```
 *
 * @remarks
 * Permission keys use the pattern `storage:resource:action` to decouple the UI
 * from specific backend implementations. Swift uses "containers" and Ceph uses
 * "buckets" terminology in policy files, but both are abstracted at the UI layer.
 *
 * The UI can choose to use:
 * - `storage:containers:*` for Swift
 * - `storage:buckets:*` for Ceph S3
 * - Or implement a unified abstraction that works with both
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

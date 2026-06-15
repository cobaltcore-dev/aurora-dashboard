import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Swift and Ceph Object Storage services.
 *
 * Maps frontend permission keys to OpenStack policy rules.
 * Format: "service:action" → { engine: "service", rule: "openstack_policy_rule" }
 *
 * Note: Both Swift and Ceph use the same object_storage policy rules,
 * but are loaded from separate policy files (swift.yaml, ceph.yaml)
 * to allow independent customization.
 */
const STORAGE_MAPPINGS = {
  // Swift Container Operations
  "swift:container_list": { engine: "swift", rule: "object_storage:container_list" },
  "swift:container_get": { engine: "swift", rule: "object_storage:container_get" },
  "swift:container_create": { engine: "swift", rule: "object_storage:container_create" },
  "swift:container_update": { engine: "swift", rule: "object_storage:container_update" },
  "swift:container_delete": { engine: "swift", rule: "object_storage:container_delete" },
  "swift:container_empty": { engine: "swift", rule: "object_storage:container_empty" },
  "swift:container_check_acls": { engine: "swift", rule: "object_storage:container_check_acls" },
  "swift:container_show_access_control": { engine: "swift", rule: "object_storage:container_show_access_control" },
  "swift:container_update_access_control": {
    engine: "swift",
    rule: "object_storage:container_update_access_control",
  },

  // Swift Object Operations
  "swift:object_list": { engine: "swift", rule: "object_storage:object_list" },
  "swift:object_get": { engine: "swift", rule: "object_storage:object_get" },
  "swift:object_download": { engine: "swift", rule: "object_storage:object_download" },
  "swift:object_update": { engine: "swift", rule: "object_storage:object_update" },
  "swift:object_delete": { engine: "swift", rule: "object_storage:object_delete" },
  "swift:object_create_copy": { engine: "swift", rule: "object_storage:object_create_copy" },
  "swift:object_move": { engine: "swift", rule: "object_storage:object_move" },

  // Swift Folder Operations
  "swift:folder_create_object": { engine: "swift", rule: "object_storage:folder_create_object" },
  "swift:folder_create_folder": { engine: "swift", rule: "object_storage:folder_create_folder" },
  "swift:folder_delete": { engine: "swift", rule: "object_storage:folder_delete" },

  // Ceph Container Operations (S3 Buckets)
  "ceph:container_list": { engine: "ceph", rule: "object_storage:container_list" },
  "ceph:container_get": { engine: "ceph", rule: "object_storage:container_get" },
  "ceph:container_create": { engine: "ceph", rule: "object_storage:container_create" },
  "ceph:container_update": { engine: "ceph", rule: "object_storage:container_update" },
  "ceph:container_delete": { engine: "ceph", rule: "object_storage:container_delete" },
  "ceph:container_empty": { engine: "ceph", rule: "object_storage:container_empty" },
  "ceph:container_check_acls": { engine: "ceph", rule: "object_storage:container_check_acls" },
  "ceph:container_show_access_control": { engine: "ceph", rule: "object_storage:container_show_access_control" },
  "ceph:container_update_access_control": { engine: "ceph", rule: "object_storage:container_update_access_control" },

  // Ceph Object Operations (S3 Objects)
  "ceph:object_list": { engine: "ceph", rule: "object_storage:object_list" },
  "ceph:object_get": { engine: "ceph", rule: "object_storage:object_get" },
  "ceph:object_download": { engine: "ceph", rule: "object_storage:object_download" },
  "ceph:object_update": { engine: "ceph", rule: "object_storage:object_update" },
  "ceph:object_delete": { engine: "ceph", rule: "object_storage:object_delete" },
  "ceph:object_create_copy": { engine: "ceph", rule: "object_storage:object_create_copy" },
  "ceph:object_move": { engine: "ceph", rule: "object_storage:object_move" },

  // Ceph Folder Operations
  "ceph:folder_create_object": { engine: "ceph", rule: "object_storage:folder_create_object" },
  "ceph:folder_create_folder": { engine: "ceph", rule: "object_storage:folder_create_folder" },
  "ceph:folder_delete": { engine: "ceph", rule: "object_storage:folder_delete" },
} as const

/**
 * Creates a permission router for Swift and Ceph Object Storage services.
 *
 * This router provides a `canUser` procedure for checking user permissions
 * against OpenStack Swift and Ceph (S3-compatible) policy rules.
 *
 * @param policyDir - Absolute path to the directory containing policy YAML files
 * @returns A tRPC router with permission checking capabilities
 *
 * @example
 * ```typescript
 * // Check Swift container access
 * const [canList] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: "swift:container_list"
 * })
 *
 * // Check Ceph bucket operations
 * const [canList, canCreate, canDelete] = await trpc.storage.canUser.query({
 *   project_id: "abc123",
 *   permission: ["ceph:container_list", "ceph:container_create", "ceph:container_delete"]
 * })
 * ```
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

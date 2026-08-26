import { createPermissionRouter } from "../../policies/createPermissionRouter"

/**
 * Policy mappings for Object Storage services.
 *
 * Uses unified Swift terminology (containers, objects, folders) for both Swift and Ceph backends.
 * The same permission keys work for both backends via a single storage policy engine.
 *
 * Design principles:
 * - Scope: "storage" (object storage service)
 * - Resource: Swift terminology (containers, objects, folders) plus Ceph/S3-specific
 *   resources kept plural, snake_case, and backend-agnostic (e.g. `container_policies`, not
 *  `bucket_policies`/`s3_bucket_policies` - "container" is used everywhere, matching the
 *  Swift-derived `containers` resource, never "bucket")
 * - Action: CRUD verbs (read, create, update, delete, manage)
 *
 * Pattern: `storage:resource:action`
 *
 * Ceph/S3-specific notes:
 * - The bucket-level versioning *toggle* has no Swift analogue, so it stays on the
 *   `containers` resource with a compound action (`update_versioning`), mirroring the
 *   existing `update_acls`.
 * - These checks are UX-only: Ceph independently enforces access via EC2 credentials and
 *   bucket policy, so this gating never substitutes for real authorization.
 * - Read/list/view actions are deliberately not gated anywhere in this file (matches the
 *   rest of the app - see `useSecurityGroupPermissions`, whose `canView` is fetched but
 *   never consumed for hiding UI).
 * - `storage:objects:share` is viewer-tier because a presigned GET URL grants exactly the
 *   access the viewer already has via `storage:objects:download` - it re-exports an existing
 *   capability, not a new one.
 * - `storage:credentials:create` is viewer-tier because it's a self-service prerequisite for
 *   *any* Ceph access at all, including read-only browsing; requiring admin would make a
 *   `storage_viewer` unable to list buckets.
 * - Operators forking `storage.json` should keep these two rules at viewer tier unless they
 *   deliberately want to lock read-only users out of S3 entirely.
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
  "storage:containers:update_versioning": {
    engine: "storage",
    rule: "storage:container_versioning_update",
  },

  // Object Operations
  "storage:objects:read": { engine: "storage", rule: "storage:object_get" },
  "storage:objects:list": { engine: "storage", rule: "storage:object_list" },
  "storage:objects:download": { engine: "storage", rule: "storage:object_download" },
  "storage:objects:create": { engine: "storage", rule: "storage:object_update" },
  "storage:objects:update": { engine: "storage", rule: "storage:object_update" },
  "storage:objects:delete": { engine: "storage", rule: "storage:object_delete" },
  "storage:objects:copy": { engine: "storage", rule: "storage:object_create_copy" },
  "storage:objects:move": { engine: "storage", rule: "storage:object_move" },
  "storage:objects:share": { engine: "storage", rule: "storage:object_share" },

  // Folder Operations
  "storage:folders:create_object": { engine: "storage", rule: "storage:folder_create_object" },
  "storage:folders:create": { engine: "storage", rule: "storage:folder_create_folder" },
  "storage:folders:delete": { engine: "storage", rule: "storage:folder_delete" },

  // Object Version Operations
  "storage:object_versions:delete": { engine: "storage", rule: "storage:object_version_delete" },
  "storage:object_versions:restore": { engine: "storage", rule: "storage:object_version_restore" },

  // Container Policy Operations
  "storage:container_policies:update": { engine: "storage", rule: "storage:container_policy_update" },
  "storage:container_policies:delete": { engine: "storage", rule: "storage:container_policy_delete" },

  // CORS Operations
  "storage:container_cors_rules:update": { engine: "storage", rule: "storage:container_cors_update" },
  "storage:container_cors_rules:delete": { engine: "storage", rule: "storage:container_cors_delete" },

  // Lifecycle Operations
  "storage:container_lifecycle_rules:update": { engine: "storage", rule: "storage:container_lifecycle_update" },
  "storage:container_lifecycle_rules:delete": { engine: "storage", rule: "storage:container_lifecycle_delete" },

  // Credential Operations
  "storage:credentials:create": { engine: "storage", rule: "storage:credential_create" },
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

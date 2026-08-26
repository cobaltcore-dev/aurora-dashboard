import { trpcReact } from "@/client/trpcClient"

/**
 * Mutation-only permissions for the Ceph/S3 Object Storage UI.
 *
 * Read/list/view/download actions are deliberately not represented here - this codebase's
 * established convention (see `useSecurityGroupPermissions`) is to gate mutations only, never
 * reads. There is nothing to query for those actions.
 */
export interface CephPermissions {
  canCreateBucket: boolean
  canDeleteBucket: boolean
  canEmptyBucket: boolean
  canUpdateVersioning: boolean
  canCreateObject: boolean
  canUpdateObject: boolean
  canDeleteObject: boolean
  canCopyObject: boolean
  canMoveObject: boolean
  canShareObject: boolean
  canCreateFolder: boolean
  canDeleteFolder: boolean
  canDeleteVersion: boolean
  canRestoreVersion: boolean
  canUpdatePolicy: boolean
  canDeletePolicy: boolean
  canUpdateCors: boolean
  canDeleteCors: boolean
  canUpdateLifecycle: boolean
  canDeleteLifecycle: boolean
  canCreateCredential: boolean
}

/**
 * Single source of truth mapping each `CephPermissions` key to the `storage:*` permission
 * string the server checks. The request array and the `select` key order below are both
 * derived from this map, so a reorder/insert here can't desync them the way two independently
 * maintained positional lists could - the `satisfies` clause fails to compile if a key is
 * missing or misspelled.
 *
 * Scope note: this only buys `CephPermissions`-key safety. `canUser`'s tRPC input is plain
 * `string` (not a literal union), so a typo'd permission string on the right-hand side still
 * only fails at runtime (see the module docblock in `permissionRouter.ts`).
 */
const PERMISSION_MAP = {
  canCreateBucket: "storage:containers:create",
  canDeleteBucket: "storage:containers:delete",
  canEmptyBucket: "storage:containers:empty",
  canUpdateVersioning: "storage:containers:update_versioning",
  canCreateObject: "storage:objects:create",
  canUpdateObject: "storage:objects:update",
  canDeleteObject: "storage:objects:delete",
  canCopyObject: "storage:objects:copy",
  canMoveObject: "storage:objects:move",
  canShareObject: "storage:objects:share",
  canCreateFolder: "storage:folders:create",
  canDeleteFolder: "storage:folders:delete",
  canDeleteVersion: "storage:object_versions:delete",
  canRestoreVersion: "storage:object_versions:restore",
  canUpdatePolicy: "storage:container_policies:update",
  canDeletePolicy: "storage:container_policies:delete",
  canUpdateCors: "storage:container_cors_rules:update",
  canDeleteCors: "storage:container_cors_rules:delete",
  canUpdateLifecycle: "storage:container_lifecycle_rules:update",
  canDeleteLifecycle: "storage:container_lifecycle_rules:delete",
  canCreateCredential: "storage:credentials:create",
} as const satisfies Record<keyof CephPermissions, string>

// Module-level constants, not computed in the hook body: this array is part of the tRPC query
// key, so a fresh array identity on every render would defeat the `staleTime: Infinity` cache.
const PERMISSION_KEYS = Object.keys(PERMISSION_MAP) as (keyof CephPermissions)[]
const PERMISSION_REQUEST = PERMISSION_KEYS.map((key) => PERMISSION_MAP[key])

const DEFAULT_PERMISSIONS: CephPermissions = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, false])
) as unknown as CephPermissions

/**
 * Hook to fetch Ceph/S3 Object Storage mutation permissions for the current user.
 * Uses React Query with infinite cache since permissions don't change during session.
 *
 * Defaults to all-false while loading or on error, so mutation controls stay hidden
 * (fail-closed) rather than being briefly or permanently shown for a permission the user
 * doesn't actually have - this also covers operators whose `storage.json` is missing one of
 * the newer Ceph rules.
 */
export function useCephPermissions(projectId: string) {
  const {
    data: permissions = DEFAULT_PERMISSIONS,
    isLoading,
    isError,
  } = trpcReact.storage.canUser.useQuery(
    {
      project_id: projectId || "",
      permission: PERMISSION_REQUEST,
    },
    {
      enabled: Boolean(projectId), // Only fetch if we have a project ID
      select: (results): CephPermissions =>
        Object.fromEntries(
          PERMISSION_KEYS.map((key, index) => [key, results[index] ?? false])
        ) as unknown as CephPermissions,
      staleTime: Infinity, // Permissions don't change during session
      gcTime: Infinity, // Keep in cache forever (previously cacheTime)
    }
  )

  return {
    permissions,
    isLoading,
    isError,
  }
}

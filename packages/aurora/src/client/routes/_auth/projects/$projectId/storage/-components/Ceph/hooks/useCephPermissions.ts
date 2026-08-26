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

const DEFAULT_PERMISSIONS: CephPermissions = {
  canCreateBucket: false,
  canDeleteBucket: false,
  canEmptyBucket: false,
  canUpdateVersioning: false,
  canCreateObject: false,
  canUpdateObject: false,
  canDeleteObject: false,
  canCopyObject: false,
  canMoveObject: false,
  canShareObject: false,
  canCreateFolder: false,
  canDeleteFolder: false,
  canDeleteVersion: false,
  canRestoreVersion: false,
  canUpdatePolicy: false,
  canDeletePolicy: false,
  canUpdateCors: false,
  canDeleteCors: false,
  canUpdateLifecycle: false,
  canDeleteLifecycle: false,
  canCreateCredential: false,
}

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
      // Order must match the `select` destructuring below.
      permission: [
        "storage:containers:create",
        "storage:containers:delete",
        "storage:containers:empty",
        "storage:containers:update_versioning",
        "storage:objects:create",
        "storage:objects:update",
        "storage:objects:delete",
        "storage:objects:copy",
        "storage:objects:move",
        "storage:objects:share",
        "storage:folders:create",
        "storage:folders:delete",
        "storage:object_versions:delete",
        "storage:object_versions:restore",
        "storage:container_policies:update",
        "storage:container_policies:delete",
        "storage:container_cors_rules:update",
        "storage:container_cors_rules:delete",
        "storage:container_lifecycle_rules:update",
        "storage:container_lifecycle_rules:delete",
        "storage:s3_credentials:create",
      ],
    },
    {
      enabled: Boolean(projectId), // Only fetch if we have a project ID
      select: ([
        canCreateBucket,
        canDeleteBucket,
        canEmptyBucket,
        canUpdateVersioning,
        canCreateObject,
        canUpdateObject,
        canDeleteObject,
        canCopyObject,
        canMoveObject,
        canShareObject,
        canCreateFolder,
        canDeleteFolder,
        canDeleteVersion,
        canRestoreVersion,
        canUpdatePolicy,
        canDeletePolicy,
        canUpdateCors,
        canDeleteCors,
        canUpdateLifecycle,
        canDeleteLifecycle,
        canCreateCredential,
      ]): CephPermissions => ({
        canCreateBucket,
        canDeleteBucket,
        canEmptyBucket,
        canUpdateVersioning,
        canCreateObject,
        canUpdateObject,
        canDeleteObject,
        canCopyObject,
        canMoveObject,
        canShareObject,
        canCreateFolder,
        canDeleteFolder,
        canDeleteVersion,
        canRestoreVersion,
        canUpdatePolicy,
        canDeletePolicy,
        canUpdateCors,
        canDeleteCors,
        canUpdateLifecycle,
        canDeleteLifecycle,
        canCreateCredential,
      }),
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

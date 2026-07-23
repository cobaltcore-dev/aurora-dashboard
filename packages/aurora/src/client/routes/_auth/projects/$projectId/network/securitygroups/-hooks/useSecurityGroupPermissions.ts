import { trpcReact } from "@/client/trpcClient"

export interface SecurityGroupPermissions {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canCreateRule: boolean
  canDeleteRule: boolean
  canManageAccess: boolean
  canViewRBAC: boolean
}

/**
 * Hook to fetch security group permissions for the current user
 * Uses React Query with infinite cache since permissions don't change during session
 */
export function useSecurityGroupPermissions(projectId: string) {
  const {
    data: permissions = {
      canView: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canCreateRule: false,
      canDeleteRule: false,
      canManageAccess: false,
      canViewRBAC: false,
    },
    isLoading,
    isError,
  } = trpcReact.network.canUser.useQuery(
    {
      project_id: projectId || "",
      permission: [
        "network:security_groups:read",
        "network:security_groups:create",
        "network:security_groups:update",
        "network:security_groups:delete",
        "network:security_group_rules:create",
        "network:security_group_rules:delete",
        "network:rbac_policies:create",
        "network:rbac_policies:delete",
        "network:rbac_policies:read",
      ],
    },
    {
      enabled: Boolean(projectId), // Only fetch if we have a project ID
      select: ([
        canView,
        canCreate,
        canUpdate,
        canDelete,
        canCreateRule,
        canDeleteRule,
        canCreateRBAC,
        canDeleteRBAC,
        canViewRBAC,
      ]) => ({
        canView,
        canCreate,
        canUpdate,
        canDelete,
        canCreateRule,
        canDeleteRule,
        canManageAccess: canCreateRBAC && canDeleteRBAC,
        canViewRBAC,
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

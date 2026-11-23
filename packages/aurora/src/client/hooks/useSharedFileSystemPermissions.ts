import { trpcReact } from "@/client/trpcClient"
import { SHARED_FILE_SYSTEM_PERMISSIONS } from "@/types/sharedFileSystem"

/**
 * Shared query key for navigation, cards, lists, details, and relationship links.
 * The caller passes enabled = Manila in catalog. There is no server availability query.
 */
export function useSharedFileSystemPermissions(projectId: string, enabled = true) {
  const active = enabled && Boolean(projectId)
  const query = trpcReact.sharedFileSystem.canUser.useQuery(
    { project_id: projectId, permission: [...SHARED_FILE_SYSTEM_PERMISSIONS] },
    { enabled: active, staleTime: 60_000, retry: false, refetchOnReconnect: false }
  )
  const verified = active && !query.error
  const has = (p: (typeof SHARED_FILE_SYSTEM_PERMISSIONS)[number]) =>
    verified && (query.data?.[SHARED_FILE_SYSTEM_PERMISSIONS.indexOf(p)] ?? false)

  return {
    ...query,
    isPending: active && query.isPending,
    error: query.error,
    refetch: query.refetch,
    canListShares: has("shared-file-system:shares:list"),
    canReadShares: has("shared-file-system:shares:read"),
    canListExportLocations: has("shared-file-system:export_locations:list"),
    canListSnapshots: has("shared-file-system:snapshots:list"),
    canReadSnapshots: has("shared-file-system:snapshots:read"),
    canListReplicas: has("shared-file-system:replicas:list"),
    canListShareNetworks: has("shared-file-system:share_networks:list"),
    canReadShareNetworks: has("shared-file-system:share_networks:read"),
    canListSecurityServices: has("shared-file-system:security_services:list"),
    canReadSecurityServices: has("shared-file-system:security_services:read"),
    canListAny:
      has("shared-file-system:shares:list") ||
      has("shared-file-system:share_networks:list") ||
      has("shared-file-system:security_services:list"),
  }
}

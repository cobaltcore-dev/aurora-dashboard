import { trpcReact } from "@/client/trpcClient"
import { VOLUME_PERMISSIONS } from "@/types/volume"

/** Shared query key for navigation, cards, lists, details, and relationship links. */
export function useVolumePermissions(projectId: string, enabled = true) {
  const query = trpcReact.volume.canUser.useQuery(
    { project_id: projectId, permission: [...VOLUME_PERMISSIONS] },
    { enabled: enabled && Boolean(projectId), staleTime: 60_000, retry: false, refetchOnReconnect: false }
  )
  return {
    ...query,
    canListVolumes: query.data?.[0] ?? false,
    canReadVolumes: query.data?.[1] ?? false,
    canListSnapshots: query.data?.[2] ?? false,
    canReadSnapshots: query.data?.[3] ?? false,
  }
}

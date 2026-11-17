import { trpcReact } from "@/client/trpcClient"
import { VOLUME_PERMISSIONS } from "@/types/volume"

/** Shared query key for navigation, cards, lists, details, and relationship links. */
export function useVolumePermissions(projectId: string, enabled = true) {
  const active = enabled && Boolean(projectId)
  const availability = trpcReact.volume.getAvailability.useQuery(
    { project_id: projectId },
    { enabled: active, staleTime: 60_000, retry: false, refetchOnReconnect: false }
  )
  const isAvailable = Boolean(availability.data?.available) && !availability.error
  const query = trpcReact.volume.canUser.useQuery(
    { project_id: projectId, permission: [...VOLUME_PERMISSIONS] },
    { enabled: active && isAvailable, staleTime: 60_000, retry: false, refetchOnReconnect: false }
  )
  const hasVerifiedPermissions = isAvailable && !query.error
  return {
    ...query,
    isAvailable,
    isPending: active && (availability.isPending || (isAvailable && query.isPending)),
    error: availability.error ?? query.error,
    refetch: async () => {
      const result = await availability.refetch()
      if (result.data?.available) return query.refetch()
      return result
    },
    canListVolumes: hasVerifiedPermissions && (query.data?.[0] ?? false),
    canReadVolumes: hasVerifiedPermissions && (query.data?.[1] ?? false),
    canListSnapshots: hasVerifiedPermissions && (query.data?.[2] ?? false),
    canReadSnapshots: hasVerifiedPermissions && (query.data?.[3] ?? false),
  }
}

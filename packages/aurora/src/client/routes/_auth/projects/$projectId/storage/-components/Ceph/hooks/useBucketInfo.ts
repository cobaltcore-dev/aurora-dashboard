import { useMemo } from "react"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"

interface UseBucketInfoProps {
  bucketName: string
  enabled?: boolean
}

interface BucketInfo {
  versioningStatus:
    | {
        status: "Enabled" | "Suspended" | "Unversioned"
      }
    | undefined
  policyData:
    | {
        policy: unknown
      }
    | undefined
  hasOldVersionsOrDeleteMarkers: boolean
  isLoading: boolean
}

/**
 * Custom hook to fetch all bucket-related information
 *
 * Consolidates:
 * - Bucket policy query
 * - CORS configuration query (prefetch only: warms the cache for CorsRulesTab)
 * - Lifecycle configuration query (prefetch only: warms the cache for LifecycleRulesTab)
 * - Bucket state query (versioning status / emptiness / old-versions / delete-markers)
 *
 * Bucket emptiness and version state come from `storage.ceph.containers.getState`, a single
 * bounded server-side scan — this hook used to also call `containers.list` to read
 * `bucket.count` and a truncation-prone `objects.list` probe; both are gone, so the numbers
 * here can't disagree with each other or lie about a bucket being empty.
 *
 * The versioning status comes from that same call. There is no separate `versioning.getStatus`
 * query: `getState` has to issue `GetBucketVersioning` anyway to decide whether there is any
 * history worth scanning, so asking a second time was a duplicate round-trip for a value the
 * server already had in hand.
 *
 * @param bucketName - The name of the bucket
 * @param enabled - Whether queries should be enabled (default: true)
 * @returns Bucket information and loading state
 */
export const useBucketInfo = ({ bucketName, enabled = true }: UseBucketInfoProps): BucketInfo => {
  const projectId = useProjectId()

  // Query bucket policy status
  const { data: policyData, isLoading: isLoadingPolicy } = trpcReact.storage.ceph.bucketPolicy.get.useQuery(
    {
      project_id: projectId ?? "",
      bucketName: bucketName,
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false,
    }
  )

  // Prefetch only: warms the shared cors.get cache consumed by CorsRulesTab (5 min staleTime).
  const { isLoading: isLoadingCors } = trpcReact.storage.ceph.cors.get.useQuery(
    {
      project_id: projectId ?? "",
      bucketName: bucketName,
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false,
    }
  )

  // Prefetch lifecycle configuration (warms the shared lifecycle.get cache consumed by LifecycleRulesTab)
  trpcReact.storage.ceph.lifecycle.get.useQuery(
    {
      project_id: projectId ?? "",
      bucketName: bucketName,
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes, shared with LifecycleRulesTab
      retry: false,
    }
  )

  // Query bucket state (versioning status / old versions / delete markers). `getState` also
  // reports emptiness, but this hook exposes only what its one consumer reads - the modals that
  // need emptiness query `getState` themselves and hit the same cache entry.
  const { data: bucketState, isLoading: isLoadingBucketState } = trpcReact.storage.ceph.containers.getState.useQuery(
    {
      project_id: projectId ?? "",
      bucketName,
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 30 * 1000, // 30 seconds cache
    }
  )

  // Kept as an object rather than the bare string so the two consumers below read unchanged,
  // and memoized so a re-render doesn't hand them a fresh reference every time.
  const versioningStatus = useMemo(
    () => (bucketState ? { status: bucketState.status } : undefined),
    [bucketState?.status]
  )

  return {
    versioningStatus,
    policyData,
    hasOldVersionsOrDeleteMarkers: bucketState?.hasOldVersionsOrDeleteMarkers ?? false,
    isLoading: isLoadingPolicy || isLoadingCors || isLoadingBucketState,
  }
}

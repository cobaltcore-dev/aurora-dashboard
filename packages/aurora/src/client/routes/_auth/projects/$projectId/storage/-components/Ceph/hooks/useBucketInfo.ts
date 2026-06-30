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
  hasVersionsOrDeleteMarkers: boolean
  isBucketEmptyWithVersions: boolean
  isBucketEmpty: boolean
  isLoading: boolean
}

/**
 * Custom hook to fetch all bucket-related information
 *
 * Consolidates:
 * - Bucket metadata (count, size, etc.) from containers.list
 * - Versioning status query
 * - Bucket policy query
 * - Version/delete marker check query
 *
 * Uses bucket.count from metadata (same as Buckets page) to determine if bucket is empty.
 * This ensures consistent behavior across Buckets page and Objects page.
 *
 * @param bucketName - The name of the bucket
 * @param enabled - Whether queries should be enabled (default: true)
 * @returns Bucket information and loading state
 */
export const useBucketInfo = ({ bucketName, enabled = true }: UseBucketInfoProps): BucketInfo => {
  const projectId = useProjectId()

  // Query bucket metadata to get accurate count (same as Buckets page)
  const { data: bucketsData, isLoading: isLoadingBuckets } = trpcReact.storage.ceph.containers.list.useQuery(
    {
      project_id: projectId ?? "",
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 30 * 1000, // 30 seconds cache
    }
  )

  // Find the current bucket in the list
  const bucket = bucketsData?.find((b) => b.name === bucketName)
  const bucketObjectCount = bucket?.count ?? 0

  // Query versioning status
  const { data: versioningStatus, isLoading: isLoadingVersioning } =
    trpcReact.storage.ceph.versioning.getStatus.useQuery(
      {
        project_id: projectId ?? "",
        bucket: bucketName,
      },
      {
        enabled: !!projectId && enabled,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      }
    )

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

  // Query to check if bucket has objects/versions/delete markers
  // Use showVersions=true to detect all content types
  // This query works for both versioned and unversioned buckets:
  // - Unversioned: returns current objects in "versions" array
  // - Versioned: returns all versions and delete markers
  const { data: versionCheckData, isLoading: isLoadingVersionCheck } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucketName,
      maxKeys: 1,
      delimiter: "",
      showVersions: true,
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 30 * 1000, // 30 seconds cache
    }
  )

  const isVersioningEnabled = versioningStatus?.status === "Enabled" || versioningStatus?.status === "Suspended"

  // Check if bucket has versions/delete markers
  const allVersions = versionCheckData?.versions ?? []
  const realVersions = allVersions.filter((v) => !v.isDeleteMarker)

  // For unversioned buckets: versions array contains current objects
  // For versioned buckets: check actual versions
  const hasRealVersions = isVersioningEnabled ? realVersions.length > 0 : false
  const hasOnlyDeleteMarkers = isVersioningEnabled && allVersions.length > 0 && realVersions.length === 0

  // For unversioned buckets, versions array contains current objects
  const effectiveObjectCount = isVersioningEnabled ? bucketObjectCount : bucketObjectCount + realVersions.length

  // Bucket is empty only if:
  // - no current objects (considering unversioned bucket logic) AND
  // - no real versions exist (only delete markers or nothing)
  const isBucketEmpty = effectiveObjectCount === 0 && !hasRealVersions

  // Show "Delete Versions" only when bucket is truly empty but has delete markers
  const isBucketEmptyWithVersions = isBucketEmpty && hasOnlyDeleteMarkers

  return {
    versioningStatus,
    policyData,
    hasVersionsOrDeleteMarkers: allVersions.length > 0,
    isBucketEmptyWithVersions,
    isBucketEmpty,
    isLoading: isLoadingBuckets || isLoadingVersioning || isLoadingPolicy || isLoadingVersionCheck,
  }
}

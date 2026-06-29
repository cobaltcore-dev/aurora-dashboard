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
  isLoading: boolean
}

/**
 * Custom hook to fetch all bucket-related information
 *
 * Consolidates:
 * - Versioning status query
 * - Bucket policy query
 * - Version/delete marker check query
 *
 * @param bucketName - The name of the bucket
 * @param enabled - Whether queries should be enabled (default: true)
 * @returns Bucket information and loading state
 */
export const useBucketInfo = ({ bucketName, enabled = true }: UseBucketInfoProps): BucketInfo => {
  const projectId = useProjectId()

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

  // Query to check if bucket has versions/delete markers
  const { data: versionCheckData, isLoading: isLoadingVersionCheck } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucketName,
      maxKeys: 1,
      delimiter: "",
      showVersions: true,
    },
    {
      enabled: !!projectId && enabled && versioningStatus?.status !== "Unversioned",
      staleTime: 30 * 1000, // 30 seconds cache
    }
  )

  // Check if bucket is empty but has versions/delete markers
  const hasVersionsOrDeleteMarkers = Boolean(versionCheckData?.versions && versionCheckData.versions.length > 0)
  const isBucketEmptyWithVersions = hasVersionsOrDeleteMarkers

  return {
    versioningStatus,
    policyData,
    hasVersionsOrDeleteMarkers,
    isBucketEmptyWithVersions,
    isLoading: isLoadingVersioning || isLoadingPolicy || isLoadingVersionCheck,
  }
}

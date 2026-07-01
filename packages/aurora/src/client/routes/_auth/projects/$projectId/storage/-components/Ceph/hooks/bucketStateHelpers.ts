import type { S3ObjectVersion } from "@/server/Storage/types/ceph"

/**
 * Helper to calculate bucket state from versioning data
 *
 * @param allVersions - All versions/objects from the list query with showVersions=true
 * @param isVersioningEnabled - Whether bucket has versioning Enabled or Suspended
 * @param bucketObjectCount - Object count from bucket metadata (may be 0 even with objects due to how S3 counts)
 * @returns Calculated state flags for bucket emptiness and version status
 */
export function calculateBucketState(
  allVersions: S3ObjectVersion[],
  isVersioningEnabled: boolean,
  bucketObjectCount: number
) {
  // Current objects = isLatest=true and not delete markers
  const currentVersions = allVersions.filter((v) => v.isLatest && !v.isDeleteMarker)

  // Real versions (not delete markers) - includes both current and old
  const realVersions = allVersions.filter((v) => !v.isDeleteMarker)

  // Check if there are ONLY delete markers (no real objects/versions at all)
  const hasOnlyDeleteMarkers = isVersioningEnabled && allVersions.length > 0 && realVersions.length === 0

  // Check if there are old versions (not current) or any delete markers
  // Used to determine if "Delete Versions" action is needed
  const hasOldVersionsOrDeleteMarkers =
    isVersioningEnabled && allVersions.some((v) => v.isDeleteMarker || (!v.isLatest && !v.isDeleteMarker))

  // Count current objects for bucket emptiness check
  // - For versioned buckets: use bucketObjectCount from metadata OR count current versions if metadata is 0
  // - For unversioned buckets: count all real versions (they are all current)
  const effectiveCurrentObjectCount = isVersioningEnabled
    ? bucketObjectCount > 0
      ? bucketObjectCount
      : currentVersions.length
    : bucketObjectCount + realVersions.length

  // Bucket is empty only if there are no current objects
  const isBucketEmpty = effectiveCurrentObjectCount === 0

  return {
    currentVersions,
    hasOnlyDeleteMarkers,
    hasOldVersionsOrDeleteMarkers,
    effectiveCurrentObjectCount,
    isBucketEmpty,
  }
}

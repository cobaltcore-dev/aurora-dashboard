import {
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { z } from "zod"
import { cephProtectedProcedure } from "../../cephProcedure"
import {
  getVersioningStatusInputSchema,
  setVersioningInputSchema,
  listVersionsInputSchema,
  deleteVersionInputSchema,
  restoreVersionInputSchema,
  listObjectVersionsInputSchema,
  type VersioningStatus,
  type ObjectVersion,
  type RestoreVersionOutput,
} from "../../types/versioning"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"

/**
 * Output from listing versions
 */
export interface ListVersionsOutput {
  versions: ObjectVersion[]
  deleteMarkers: ObjectVersion[]
  isTruncated: boolean
  nextKeyMarker?: string
  nextVersionIdMarker?: string
  prefix?: string
  maxKeys?: number
}

/**
 * tRPC router for S3 bucket versioning operations.
 *
 * Provides endpoints for:
 * - Getting and setting bucket versioning status
 * - Listing all versions in a bucket (with pagination)
 * - Listing versions for a specific object
 * - Permanently deleting specific versions
 * - Restoring previous versions
 *
 * All procedures require EC2 credentials (enforced by cephProtectedProcedure).
 */
export const versioningRouter = {
  /**
   * Get versioning status for a bucket.
   *
   * Returns whether versioning is Enabled, Suspended, or Unversioned.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  getStatus: cephProtectedProcedure
    .input(getVersioningStatusInputSchema)
    .query(async ({ ctx, input }): Promise<VersioningStatus> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new GetBucketVersioningCommand({
            Bucket: input.bucket,
          })
        )

        // S3 returns undefined Status when versioning never configured
        const status = response.Status || "Unversioned"

        return {
          status: status as "Enabled" | "Suspended" | "Unversioned",
          mfaDelete: response.MFADelete,
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "get versioning status",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * Enable or suspend versioning on a bucket.
   *
   * Important: Once enabled, versioning cannot be fully disabled (only suspended).
   * Suspending versioning preserves existing versions but stops creating new ones.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   * @throws TRPCError BAD_REQUEST - invalid request
   */
  setStatus: cephProtectedProcedure
    .input(setVersioningInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const s3 = ctx.getCephClient()

      try {
        await s3.send(
          new PutBucketVersioningCommand({
            Bucket: input.bucket,
            VersioningConfiguration: {
              Status: input.status,
            },
          })
        )

        return { success: true }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "set versioning status",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * List all versions in a bucket (paginated).
   *
   * Returns both regular versions and delete markers. Use pagination markers
   * for buckets with many versions.
   *
   * Pagination:
   * - First request: don't provide keyMarker or versionIdMarker
   * - Subsequent requests: use nextKeyMarker and nextVersionIdMarker from previous response
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  listVersions: cephProtectedProcedure
    .input(listVersionsInputSchema)
    .query(async ({ ctx, input }): Promise<ListVersionsOutput> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new ListObjectVersionsCommand({
            Bucket: input.bucket,
            Prefix: input.prefix,
            KeyMarker: input.keyMarker,
            VersionIdMarker: input.versionIdMarker,
            MaxKeys: input.maxKeys ?? 100,
          })
        )

        // Map regular versions
        const versions: ObjectVersion[] = (response.Versions ?? []).map((v) => ({
          key: v.Key!,
          versionId: v.VersionId!,
          isLatest: v.IsLatest ?? false,
          lastModified: v.LastModified!.toISOString(),
          size: v.Size ?? 0,
          storageClass: v.StorageClass,
          owner: v.Owner
            ? {
                displayName: v.Owner.DisplayName,
                id: v.Owner.ID,
              }
            : undefined,
          etag: v.ETag,
          isDeleteMarker: false,
        }))

        // Map delete markers (special versions created when objects are deleted)
        const deleteMarkers: ObjectVersion[] = (response.DeleteMarkers ?? []).map((dm) => ({
          key: dm.Key!,
          versionId: dm.VersionId!,
          isLatest: dm.IsLatest ?? false,
          lastModified: dm.LastModified!.toISOString(),
          size: 0,
          owner: dm.Owner
            ? {
                displayName: dm.Owner.DisplayName,
                id: dm.Owner.ID,
              }
            : undefined,
          isDeleteMarker: true,
        }))

        return {
          versions,
          deleteMarkers,
          isTruncated: response.IsTruncated ?? false,
          nextKeyMarker: response.NextKeyMarker,
          nextVersionIdMarker: response.NextVersionIdMarker,
          prefix: response.Prefix,
          maxKeys: response.MaxKeys,
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "list versions",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * List versions for a specific object.
   *
   * Returns all versions (including delete markers) for a single object key,
   * sorted by date descending (newest first).
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  listObjectVersions: cephProtectedProcedure
    .input(listObjectVersionsInputSchema)
    .query(async ({ ctx, input }): Promise<ObjectVersion[]> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new ListObjectVersionsCommand({
            Bucket: input.bucket,
            Prefix: input.key,
          })
        )

        // Map regular versions
        const versions: ObjectVersion[] = (response.Versions ?? []).map((v) => ({
          key: v.Key!,
          versionId: v.VersionId!,
          isLatest: v.IsLatest ?? false,
          lastModified: v.LastModified!.toISOString(),
          size: v.Size ?? 0,
          storageClass: v.StorageClass,
          owner: v.Owner
            ? {
                displayName: v.Owner.DisplayName,
                id: v.Owner.ID,
              }
            : undefined,
          etag: v.ETag,
          isDeleteMarker: false,
        }))

        // Map delete markers
        const deleteMarkers: ObjectVersion[] = (response.DeleteMarkers ?? []).map((dm) => ({
          key: dm.Key!,
          versionId: dm.VersionId!,
          isLatest: dm.IsLatest ?? false,
          lastModified: dm.LastModified!.toISOString(),
          size: 0,
          owner: dm.Owner
            ? {
                displayName: dm.Owner.DisplayName,
                id: dm.Owner.ID,
              }
            : undefined,
          isDeleteMarker: true,
        }))

        // Filter to exact key match (prefix can return more) and combine
        const allVersions = [...versions, ...deleteMarkers].filter((v) => v.key === input.key)

        // Sort by date descending (newest first)
        return allVersions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "list object versions",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Permanently delete a specific version.
   *
   * WARNING: This operation is irreversible. The version will be permanently removed.
   *
   * Use cases:
   * - Removing a delete marker to "undelete" an object
   * - Permanently removing old versions to save space
   * - Compliance requirements (data retention policies)
   *
   * @throws TRPCError NOT_FOUND - version does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  deleteVersion: cephProtectedProcedure
    .input(deleteVersionInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const s3 = ctx.getCephClient()

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
            VersionId: input.versionId,
          })
        )

        return { success: true }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "delete version",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Restore an old version (makes it the new latest version).
   *
   * How it works:
   * 1. Copies the old version to the same key
   * 2. Creates a new latest version with the old version's content
   * 3. All versions are preserved (including the old and new versions)
   *
   * @returns The new version ID created by the restore operation
   * @throws TRPCError NOT_FOUND - version does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  restoreVersion: cephProtectedProcedure
    .input(restoreVersionInputSchema)
    .mutation(async ({ ctx, input }): Promise<RestoreVersionOutput> => {
      const s3 = ctx.getCephClient()

      try {
        // Copy the old version to the same key - creates new latest version
        // URL-encode both the key and versionId to handle special characters (spaces, +, /, =, etc.)
        const response = await s3.send(
          new CopyObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
            CopySource: `${input.bucket}/${encodeURIComponent(input.key)}?versionId=${encodeURIComponent(input.versionId)}`,
          })
        )

        return {
          success: true,
          versionId: response.VersionId ?? "null",
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "restore version",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Check if folders contain deleted files (files with delete markers).
   *
   * For each folder, performs a query without delimiter to check all nested objects.
   * Returns whether each folder contains at least one file with a delete marker as latest version.
   *
   * Note: This can be expensive for many folders (N S3 requests for N folders).
   * Use sparingly and consider caching.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  checkDeletedContent: cephProtectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        bucket: z.string().min(1),
        folders: z.array(z.string()).max(100), // Limit to 100 folders to avoid too many S3 requests
      })
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        Array<{
          prefix: string
          hasDeletedContent: boolean
        }>
      > => {
        const s3 = ctx.getCephClient()

        try {
          // Check each folder in parallel
          const results = await Promise.all(
            input.folders.map(async (folderPrefix) => {
              try {
                // Query without delimiter to get all nested objects
                // Paginate through all versions to find if ANY delete marker exists
                let hasDeleteMarkers = false
                let keyMarker: string | undefined
                let versionIdMarker: string | undefined

                // Keep paginating until we find a delete marker or reach the end
                while (!hasDeleteMarkers) {
                  const response = await s3.send(
                    new ListObjectVersionsCommand({
                      Bucket: input.bucket,
                      Prefix: folderPrefix,
                      MaxKeys: 100, // Reasonable batch size for pagination
                      KeyMarker: keyMarker,
                      VersionIdMarker: versionIdMarker,
                    })
                  )

                  // Check if there are any delete markers in this page
                  hasDeleteMarkers = (response.DeleteMarkers?.length ?? 0) > 0

                  // If no more results or found a delete marker, stop
                  if (!response.IsTruncated || hasDeleteMarkers) {
                    break
                  }

                  // Continue to next page
                  keyMarker = response.NextKeyMarker
                  versionIdMarker = response.NextVersionIdMarker
                }

                return {
                  prefix: folderPrefix,
                  hasDeletedContent: hasDeleteMarkers,
                }
              } catch (error) {
                // If query fails for this folder, assume no deleted content
                console.error(`Failed to check deleted content for folder ${folderPrefix}:`, error)
                return {
                  prefix: folderPrefix,
                  hasDeletedContent: false,
                }
              }
            })
          )

          return results
        } catch (error) {
          throw mapS3ErrorToTRPCError(error, {
            operation: "check deleted content",
            bucket: input.bucket,
          })
        }
      }
    ),
}

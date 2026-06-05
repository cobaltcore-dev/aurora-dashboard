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
import { VersioningService, type ListVersionsOutput } from "../../services/versioningService"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"

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
      const service = new VersioningService(s3)

      try {
        return await service.getVersioningStatus(input.bucket)
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
      const service = new VersioningService(s3)

      try {
        await service.setVersioningStatus(input.bucket, input.status)
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
      const service = new VersioningService(s3)

      try {
        // Transform input to service layer (remove project_id)
        return await service.listVersions({
          bucket: input.bucket,
          prefix: input.prefix,
          keyMarker: input.keyMarker,
          versionIdMarker: input.versionIdMarker,
          maxKeys: input.maxKeys,
        })
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
      const service = new VersioningService(s3)

      try {
        return await service.listObjectVersions(input.bucket, input.key)
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
      const service = new VersioningService(s3)

      try {
        await service.deleteVersion(input.bucket, input.key, input.versionId)
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
      const service = new VersioningService(s3)

      try {
        const newVersionId = await service.restoreVersion(input.bucket, input.key, input.versionId)
        return { success: true, versionId: newVersionId }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "restore version",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),
}

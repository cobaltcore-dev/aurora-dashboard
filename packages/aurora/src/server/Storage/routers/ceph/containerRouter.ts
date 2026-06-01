import { ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { cephProtectedProcedure, cephProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import { projectScopedInputSchema } from "../../../trpc"
import {
  containerSchema,
  listContainersInputSchema,
  createBucketInputSchema,
  deleteBucketInputSchema,
  type Container,
  type S3Status,
} from "../../types/ceph"
import { S3_MAX_KEYS_PER_REQUEST } from "../../constants"

export const containerRouter = {
  status: cephProcedure.input(projectScopedInputSchema).query(async ({ ctx }): Promise<S3Status> => {
    return { hasCredentials: !!ctx.cephCredentials }
  }),

  /**
   * List all buckets with optional metadata (count, bytes, last_modified).
   *
   * When includeMetadata=false (default): Returns basic bucket info only (fast)
   * When includeMetadata=true: Fetches full metadata with controlled concurrency (slower)
   *
   * Note: Metadata fetching makes one ListObjectsV2 request per bucket, which can be
   * expensive for many buckets. Use includeMetadata=true only when necessary.
   */
  list: cephProtectedProcedure.input(listContainersInputSchema).query(async ({ input, ctx }): Promise<Container[]> => {
    const s3 = ctx.getCephClient()
    const { includeMetadata } = input

    try {
      const response = await s3.send(new ListBucketsCommand({}))
      const buckets = response.Buckets ?? []

      // If metadata not requested, return buckets with basic info only (fast path)
      if (!includeMetadata) {
        return buckets.map((bucket) =>
          containerSchema.parse({
            name: bucket.Name ?? "",
            count: 0,
            bytes: 0,
            last_modified: undefined,
            creationDate: bucket.CreationDate?.toISOString(),
          })
        )
      }

      // Fetch metadata for each bucket with controlled concurrency (slow path)
      // Limit concurrent requests to avoid overwhelming S3 API and hitting rate limits
      const CONCURRENCY_LIMIT = 5
      const containersWithMetadata: Container[] = []

      for (let i = 0; i < buckets.length; i += CONCURRENCY_LIMIT) {
        const batch = buckets.slice(i, i + CONCURRENCY_LIMIT)
        const batchResults = await Promise.all(
          batch.map(async (bucket) => {
            const bucketName = bucket.Name ?? ""

            try {
              // List objects to get count, total size, and last modified
              // IMPORTANT: Using S3_MAX_KEYS_PER_REQUEST means these are ESTIMATES for buckets with >1000 objects:
              //   - count: Will be capped at 1000 (use KeyCount for actual count up to 1000)
              //   - bytes: Only sums first 1000 objects
              //   - last_modified: May miss newer objects beyond the first 1000
              //
              // This is a deliberate trade-off: fast response time for UI > perfect accuracy.
              // Full pagination would be prohibitively expensive for large buckets in a list view.
              const listObjResponse = await s3.send(
                new ListObjectsV2Command({
                  Bucket: bucketName,
                  MaxKeys: S3_MAX_KEYS_PER_REQUEST,
                })
              )

              const objects = listObjResponse.Contents ?? []
              const count = listObjResponse.KeyCount ?? 0
              const bytes = objects.reduce((sum, obj) => sum + (obj.Size ?? 0), 0)

              // Get last modified from most recent object
              // Objects are typically ordered by key, not date, so we need to find the latest
              const lastModified =
                objects.length > 0
                  ? objects
                      .reduce(
                        (latest, obj) => {
                          const objDate = obj.LastModified
                          if (!objDate) return latest
                          if (!latest || objDate > latest) return objDate
                          return latest
                        },
                        undefined as Date | undefined
                      )
                      ?.toISOString()
                  : undefined

              return containerSchema.parse({
                name: bucketName,
                count,
                bytes,
                last_modified: lastModified,
                creationDate: bucket.CreationDate?.toISOString(),
              })
            } catch (error) {
              // If bucket is inaccessible or listing fails, return minimal data
              console.error(`Failed to get metadata for bucket ${bucketName}:`, error)
              return containerSchema.parse({
                name: bucketName,
                count: 0,
                bytes: 0,
                creationDate: bucket.CreationDate?.toISOString(),
              })
            }
          })
        )
        containersWithMetadata.push(...batchResults)
      }

      return containersWithMetadata
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, { operation: "list containers" })
    }
  }),

  /**
   * Create a new S3 bucket.
   *
   * Uses AWS SDK CreateBucketCommand. The AWS SDK automatically adds LocationConstraint
   * based on the region configured in the S3 client (resolved from OpenStack service catalog).
   *
   * Bucket naming rules (validated client-side and by S3 API):
   *   - 3-63 characters
   *   - Lowercase letters, numbers, hyphens, periods only
   *   - Must start/end with letter or number
   *   - DNS-safe (no consecutive periods, not IP address format)
   *   - No reserved prefixes/suffixes
   *
   * @throws TRPCError CONFLICT - bucket already exists
   * @throws TRPCError BAD_REQUEST - invalid bucket name
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  create: cephProtectedProcedure.input(createBucketInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      await s3.send(
        new CreateBucketCommand({
          Bucket: bucketName,
        })
      )
      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, { operation: "create bucket", bucket: bucketName })
    }
  }),

  /**
   * Delete an empty S3 bucket.
   *
   * Uses AWS SDK DeleteBucketCommand. The bucket must be empty before deletion.
   * If the bucket contains objects, S3 returns BucketNotEmpty error (mapped to PRECONDITION_FAILED).
   *
   * Client-side performs a preflight check to verify the bucket is empty and blocks
   * the delete action if objects are found.
   *
   * @throws TRPCError PRECONDITION_FAILED - bucket not empty
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure.input(deleteBucketInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      await s3.send(new DeleteBucketCommand({ Bucket: bucketName }))
      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "delete bucket",
        bucket: bucketName,
      })
    }
  }),
}

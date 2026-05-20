import { ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { cephProtectedProcedure, cephProcedure } from "../cephProcedure"
import { mapS3ErrorToTRPCError } from "../helpers/s3ErrorMapper"
import { projectScopedInputSchema } from "../../trpc"
import {
  containerSchema,
  listContainersInputSchema,
  createBucketInputSchema,
  deleteBucketInputSchema,
  type Container,
  type S3Status,
} from "../types/ceph"

export const containerRouter = {
  status: cephProcedure.input(projectScopedInputSchema).query(async ({ ctx }): Promise<S3Status> => {
    return { hasCredentials: !!ctx.cephCredentials }
  }),

  /**
   * List all buckets with metadata (count, bytes, last_modified).
   * Fetches metadata for each bucket in parallel using ListObjectsV2.
   */
  list: cephProtectedProcedure.input(listContainersInputSchema).query(async ({ ctx }): Promise<Container[]> => {
    const s3 = ctx.getCephClient()

    try {
      const response = await s3.send(new ListBucketsCommand({}))
      const buckets = response.Buckets ?? []

      // Fetch metadata for each bucket in parallel
      const containersWithMetadata = await Promise.all(
        buckets.map(async (bucket) => {
          const bucketName = bucket.Name ?? ""

          try {
            // List objects to get count, total size, and last modified
            // Using MaxKeys=1000 as a reasonable batch size
            // TODO: Consider pagination for buckets with >1000 objects for accurate counts
            const listObjResponse = await s3.send(
              new ListObjectsV2Command({
                Bucket: bucketName,
                MaxKeys: 1000,
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

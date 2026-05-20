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

  create: cephProtectedProcedure.input(createBucketInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    // Log the region being used for debugging
    console.log(`[ceph] Creating bucket "${bucketName}" with region: ${ctx.cephRegion}`)

    try {
      // Ceph RGW may not require CreateBucketConfiguration for default region
      // Try without LocationConstraint first (similar to AWS us-east-1 behavior)
      await s3.send(
        new CreateBucketCommand({
          Bucket: bucketName,
        })
      )
      console.log(`[ceph] Bucket "${bucketName}" created successfully`)
      return true
    } catch (error) {
      console.error(`[ceph] Failed to create bucket "${bucketName}":`, error)
      throw mapS3ErrorToTRPCError(error, { operation: "create bucket", bucket: bucketName })
    }
  }),

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

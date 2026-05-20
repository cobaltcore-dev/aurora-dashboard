import { ListObjectsV2Command, HeadObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { TRPCError } from "@trpc/server"
import { cephProtectedProcedure } from "../cephProcedure"
import { mapS3ErrorToTRPCError } from "../helpers/s3ErrorMapper"
import {
  listObjectsInputSchema,
  listObjectsOutputSchema,
  getObjectDetailsInputSchema,
  s3ObjectDetailsSchema,
  s3ObjectSchema,
  s3FolderPrefixSchema,
  type ListObjectsOutput,
  type S3ObjectDetails,
} from "../types/ceph"
import { z } from "zod"

const deleteAllObjectsInputSchema = z.object({
  project_id: z.string(),
  containerName: z.string().min(1),
})

export const objectRouter = {
  /**
   * List objects in a container with optional prefix filtering and pagination.
   * Returns both objects and "folders" (CommonPrefixes).
   */
  list: cephProtectedProcedure
    .input(listObjectsInputSchema)
    .query(async ({ ctx, input }): Promise<ListObjectsOutput> => {
      const s3 = ctx.getCephClient!()
      const { containerName, prefix, delimiter = "/", maxKeys, continuationToken } = input

      try {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: containerName,
            Prefix: prefix || undefined,
            Delimiter: delimiter || undefined,
            MaxKeys: maxKeys,
            ContinuationToken: continuationToken,
          })
        )

        const objects = (response.Contents ?? []).map((obj) =>
          s3ObjectSchema.parse({
            key: obj.Key ?? "",
            lastModified: obj.LastModified?.toISOString(),
            size: obj.Size ?? 0,
            etag: obj.ETag,
            storageClass: obj.StorageClass,
          })
        )

        const folders = (response.CommonPrefixes ?? []).map((cp) =>
          s3FolderPrefixSchema.parse({
            prefix: cp.Prefix ?? "",
          })
        )

        return listObjectsOutputSchema.parse({
          objects,
          folders,
          isTruncated: response.IsTruncated ?? false,
          nextContinuationToken: response.NextContinuationToken,
        })
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "list objects",
          bucket: containerName,
        })
      }
    }),

  /**
   * Get detailed metadata for a specific object.
   */
  getDetails: cephProtectedProcedure
    .input(getObjectDetailsInputSchema)
    .query(async ({ ctx, input }): Promise<S3ObjectDetails> => {
      const s3 = ctx.getCephClient!()
      const { containerName, objectKey } = input

      try {
        const response = await s3.send(
          new HeadObjectCommand({
            Bucket: containerName,
            Key: objectKey,
          })
        )

        return s3ObjectDetailsSchema.parse({
          key: objectKey,
          size: response.ContentLength ?? 0,
          lastModified: response.LastModified?.toISOString(),
          etag: response.ETag,
          contentType: response.ContentType,
          storageClass: response.StorageClass,
          metadata: response.Metadata,
        })
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "get object details",
          bucket: containerName,
          key: objectKey,
        })
      }
    }),

  /**
   * Delete all objects in a bucket (empty the bucket).
   * Uses batched DeleteObjectsCommand for efficiency (up to 1000 objects per request).
   * Loops until all objects are deleted.
   */
  deleteAll: cephProtectedProcedure
    .input(deleteAllObjectsInputSchema)
    .mutation(async ({ ctx, input }): Promise<number> => {
      const s3 = ctx.getCephClient!()
      const { containerName } = input
      let totalDeleted = 0
      let continuationToken: string | undefined

      try {
        // Loop until all objects are deleted
        while (true) {
          // List next batch of objects
          const listResponse = await s3.send(
            new ListObjectsV2Command({
              Bucket: containerName,
              MaxKeys: 1000, // S3 max per request
              ContinuationToken: continuationToken,
            })
          )

          const objects = listResponse.Contents ?? []
          if (objects.length === 0) break

          // Batch delete (up to 1000 objects per request)
          const objectsToDelete = objects.map((obj) => ({ Key: obj.Key! }))

          const deleteResponse = await s3.send(
            new DeleteObjectsCommand({
              Bucket: containerName,
              Delete: { Objects: objectsToDelete },
            })
          )

          const deletedCount = deleteResponse.Deleted?.length ?? 0
          totalDeleted += deletedCount

          // Check for errors
          if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            const errorKeys = deleteResponse.Errors.map((e) => e.Key).join(", ")
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to delete some objects: ${errorKeys}`,
            })
          }

          // Continue if there are more objects
          if (!listResponse.IsTruncated) break
          continuationToken = listResponse.NextContinuationToken
        }

        return totalDeleted
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "delete all objects",
          bucket: containerName,
        })
      }
    }),
}

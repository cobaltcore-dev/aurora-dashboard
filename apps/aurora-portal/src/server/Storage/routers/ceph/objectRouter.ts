import {
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { TRPCError } from "@trpc/server"
import { cephProtectedProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import {
  listObjectsInputSchema,
  listObjectsOutputSchema,
  getObjectDetailsInputSchema,
  s3ObjectDetailsSchema,
  s3ObjectSchema,
  s3FolderPrefixSchema,
  deleteObjectInputSchema,
  createFolderInputSchema,
  copyObjectInputSchema,
  copyObjectOutputSchema,
  moveObjectInputSchema,
  updateMetadataInputSchema,
  type ListObjectsOutput,
  type S3ObjectDetails,
  type CopyObjectOutput,
} from "../../types/ceph"
import { S3_MAX_KEYS_PER_REQUEST } from "../../constants"
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
              MaxKeys: S3_MAX_KEYS_PER_REQUEST,
              ContinuationToken: continuationToken,
            })
          )

          const objects = listResponse.Contents ?? []
          if (objects.length === 0) break

          // Validate all objects have keys before deletion
          const objectsWithoutKeys = objects.filter((obj) => !obj.Key)
          if (objectsWithoutKeys.length > 0) {
            throw new Error(
              `Encountered ${objectsWithoutKeys.length} object(s) without Key field in S3 list response. Cannot proceed with deletion.`
            )
          }

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

  /**
   * Delete a single object from a bucket.
   *
   * Uses AWS SDK DeleteObjectCommand. Deleting a non-existent object is considered
   * a success (S3 is idempotent for deletes).
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure.input(deleteObjectInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient!()
    const { containerName, objectKey } = input

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: containerName,
          Key: objectKey,
        })
      )
      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "delete object",
        bucket: containerName,
        key: objectKey,
      })
    }
  }),

  /**
   * Create a folder (zero-byte object with key ending in "/").
   *
   * In S3, folders are virtual - they're just zero-byte objects with keys ending in "/".
   * This operation is idempotent - creating an existing folder succeeds.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  createFolder: cephProtectedProcedure
    .input(createFolderInputSchema)
    .mutation(async ({ ctx, input }): Promise<boolean> => {
      const s3 = ctx.getCephClient!()
      const { containerName, folderPath } = input

      // Ensure folder path ends with "/"
      const normalizedPath = folderPath.endsWith("/") ? folderPath : `${folderPath}/`

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: containerName,
            Key: normalizedPath,
            Body: Buffer.from(""),
            ContentLength: 0,
          })
        )
        return true
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "create folder",
          bucket: containerName,
          key: normalizedPath,
        })
      }
    }),

  /**
   * Copy an object within or across buckets.
   *
   * Uses AWS SDK CopyObjectCommand. Can optionally preserve or replace metadata.
   * Note: S3 copy is atomic and supports objects up to 5GB (for larger objects, use multipart copy).
   *
   * @throws TRPCError NOT_FOUND - source object or bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  copy: cephProtectedProcedure
    .input(copyObjectInputSchema)
    .mutation(async ({ ctx, input }): Promise<CopyObjectOutput> => {
      const s3 = ctx.getCephClient!()
      const { sourceBucket, sourceKey, destinationBucket, destinationKey, copyMetadata } = input

      try {
        const response = await s3.send(
          new CopyObjectCommand({
            CopySource: `/${sourceBucket}/${encodeURIComponent(sourceKey)}`,
            Bucket: destinationBucket,
            Key: destinationKey,
            MetadataDirective: copyMetadata ? "COPY" : "REPLACE",
          })
        )

        return copyObjectOutputSchema.parse({
          key: destinationKey,
          etag: response.CopyObjectResult?.ETag,
          lastModified: response.CopyObjectResult?.LastModified?.toISOString(),
        })
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "copy object",
          bucket: sourceBucket,
          key: sourceKey,
        })
      }
    }),

  /**
   * Move an object within or across buckets.
   *
   * Implemented as Copy + Delete. If the delete fails after a successful copy,
   * logs a warning but still returns success (the object was copied successfully).
   *
   * @throws TRPCError NOT_FOUND - source object or bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  move: cephProtectedProcedure.input(moveObjectInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient!()
    const { sourceBucket, sourceKey, destinationBucket, destinationKey } = input

    try {
      // Step 1: Copy the object
      await s3.send(
        new CopyObjectCommand({
          CopySource: `/${sourceBucket}/${encodeURIComponent(sourceKey)}`,
          Bucket: destinationBucket,
          Key: destinationKey,
          MetadataDirective: "COPY",
        })
      )

      // Step 2: Delete the source
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: sourceBucket,
            Key: sourceKey,
          })
        )
      } catch (deleteError) {
        // Log but don't fail - the copy succeeded, which is the primary goal
        console.error("Move operation: copy succeeded but delete failed", {
          sourceBucket,
          sourceKey,
          error: deleteError,
        })
      }

      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "move object",
        bucket: sourceBucket,
        key: sourceKey,
      })
    }
  }),

  /**
   * Update object metadata by copying the object to itself with new metadata.
   *
   * S3 doesn't support direct metadata updates - we must copy the object to itself
   * with MetadataDirective: "REPLACE". User metadata keys will have "x-amz-meta-" prefix
   * added automatically by the SDK (strip if provided by user).
   *
   * Note: S3 metadata is limited to 2KB total size.
   *
   * @throws TRPCError NOT_FOUND - object or bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   * @throws TRPCError BAD_REQUEST - metadata exceeds 2KB limit
   */
  updateMetadata: cephProtectedProcedure
    .input(updateMetadataInputSchema)
    .mutation(async ({ ctx, input }): Promise<S3ObjectDetails> => {
      const s3 = ctx.getCephClient!()
      const { containerName, objectKey, metadata } = input

      // Strip "x-amz-meta-" prefix if user provided it (SDK adds it automatically)
      const cleanedMetadata: Record<string, string> = {}
      for (const [key, value] of Object.entries(metadata)) {
        const cleanKey = key.startsWith("x-amz-meta-") ? key.substring("x-amz-meta-".length) : key
        cleanedMetadata[cleanKey] = value
      }

      try {
        // Copy object to itself with new metadata
        await s3.send(
          new CopyObjectCommand({
            CopySource: `/${containerName}/${encodeURIComponent(objectKey)}`,
            Bucket: containerName,
            Key: objectKey,
            MetadataDirective: "REPLACE",
            Metadata: cleanedMetadata,
          })
        )

        // Fetch updated object details
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
          operation: "update metadata",
          bucket: containerName,
          key: objectKey,
        })
      }
    }),
}

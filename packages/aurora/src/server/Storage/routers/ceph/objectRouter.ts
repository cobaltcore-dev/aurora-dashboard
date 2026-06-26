import {
  ListObjectsV2Command,
  ListObjectVersionsCommand,
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
  s3ObjectVersionSchema,
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
  includeVersionsAndDeleteMarkers: z.boolean().optional().default(true),
})

export const objectRouter = {
  /**
   * List objects in a container with optional prefix filtering and pagination.
   * Returns both objects and "folders" (CommonPrefixes).
   * When showVersions=true, returns all versions including delete markers.
   */
  list: cephProtectedProcedure
    .input(listObjectsInputSchema)
    .query(async ({ ctx, input }): Promise<ListObjectsOutput> => {
      const s3 = ctx.getCephClient!()
      const {
        containerName,
        prefix,
        delimiter = "/",
        maxKeys,
        continuationToken,
        keyMarker,
        versionIdMarker,
        showVersions,
      } = input

      try {
        // When showVersions is true, use ListObjectVersions instead of ListObjectsV2
        if (showVersions) {
          const response = await s3.send(
            new ListObjectVersionsCommand({
              Bucket: containerName,
              Prefix: prefix || undefined,
              Delimiter: delimiter || undefined,
              MaxKeys: maxKeys,
              KeyMarker: keyMarker,
              VersionIdMarker: versionIdMarker,
            })
          )

          // Filter versions to only show objects in current "folder" (respecting delimiter)
          // When delimiter is "/", we want to show only direct children, not nested objects
          const allVersions = [
            ...(response.Versions ?? []).map((v) => ({
              key: v.Key ?? "",
              versionId: v.VersionId ?? "",
              isLatest: v.IsLatest ?? false,
              lastModified: v.LastModified?.toISOString(),
              size: v.Size ?? 0,
              etag: v.ETag,
              storageClass: v.StorageClass,
              isDeleteMarker: false,
            })),
            ...(response.DeleteMarkers ?? []).map((dm) => ({
              key: dm.Key ?? "",
              versionId: dm.VersionId ?? "",
              isLatest: dm.IsLatest ?? false,
              lastModified: dm.LastModified?.toISOString(),
              size: 0,
              etag: undefined,
              storageClass: undefined,
              isDeleteMarker: true,
            })),
          ]

          // When delimiter is present, filter out nested objects (objects in subfolders)
          const filteredVersions = delimiter
            ? allVersions.filter((v) => {
                const relativePath = prefix ? v.key.slice(prefix.length) : v.key
                // Only include if there's no delimiter in the relative path (direct child)
                return !relativePath.includes(delimiter)
              })
            : allVersions

          const versions = filteredVersions
            .map((v) => s3ObjectVersionSchema.parse(v))
            .sort((a, b) => {
              // Sort by key first, then by lastModified (newest first)
              if (a.key !== b.key) return a.key.localeCompare(b.key)
              if (!a.lastModified || !b.lastModified) return 0
              return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
            })

          const folders = (response.CommonPrefixes ?? []).map((cp) =>
            s3FolderPrefixSchema.parse({
              prefix: cp.Prefix ?? "",
            })
          )

          return listObjectsOutputSchema.parse({
            objects: [], // Empty when showing versions
            folders,
            isTruncated: response.IsTruncated ?? false,
            nextContinuationToken: response.NextKeyMarker,
            versions,
            nextKeyMarker: response.NextKeyMarker,
            nextVersionIdMarker: response.NextVersionIdMarker,
          })
        }

        // Default behavior: ListObjectsV2 (current versions only)
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
   * Loops until all objects and versions are deleted.
   *
   * For versioned buckets, deletes all versions and delete markers to ensure the bucket
   * is truly empty and can be deleted.
   */
  deleteAll: cephProtectedProcedure
    .input(deleteAllObjectsInputSchema)
    .mutation(async ({ ctx, input }): Promise<number> => {
      const s3 = ctx.getCephClient!()
      const { containerName, includeVersionsAndDeleteMarkers } = input
      let totalDeleted = 0

      try {
        if (includeVersionsAndDeleteMarkers) {
          // Original behavior: Delete ALL versions and delete markers (full empty)
          let keyMarker: string | undefined
          let versionIdMarker: string | undefined
          // Loop until all objects and versions are deleted
          // For versioned buckets, this may take multiple iterations if deleting objects creates new delete markers
          let consecutiveEmptyScans = 0
          const MAX_EMPTY_SCANS = 3 // Safety: stop if we see empty results 3 times in a row
          let sameMarkerCount = 0
          const MAX_SAME_MARKER = 5 // Safety: stop if markers don't advance for 5 iterations

          while (true) {
            // Use ListObjectVersions to get ALL versions and delete markers
            // This is crucial for versioned buckets - ListObjectsV2 only shows current versions
            const listResponse = await s3.send(
              new ListObjectVersionsCommand({
                Bucket: containerName,
                MaxKeys: S3_MAX_KEYS_PER_REQUEST,
                KeyMarker: keyMarker,
                VersionIdMarker: versionIdMarker,
              })
            )

            // Collect both regular versions and delete markers
            const versions = listResponse.Versions ?? []
            const deleteMarkers = listResponse.DeleteMarkers ?? []
            const allItems = [...versions, ...deleteMarkers]

            console.log(
              `[deleteAll] Found ${versions.length} versions, ${deleteMarkers.length} delete markers, total: ${allItems.length}`
            )

            if (allItems.length === 0) {
              consecutiveEmptyScans++
              console.log(
                `[deleteAll] Empty scan ${consecutiveEmptyScans}/${MAX_EMPTY_SCANS}. Total deleted: ${totalDeleted}`
              )
              if (consecutiveEmptyScans >= MAX_EMPTY_SCANS) {
                // Bucket is confirmed empty after multiple scans
                console.log(`[deleteAll] Bucket is now empty. Total deleted: ${totalDeleted}`)
                break
              }
              // Reset markers and scan again to confirm
              keyMarker = undefined
              versionIdMarker = undefined
              continue
            }

            // Reset empty scan counter since we found items
            consecutiveEmptyScans = 0

            // Validate all items have keys before deletion
            const itemsWithoutKeys = allItems.filter((item) => !item.Key)
            if (itemsWithoutKeys.length > 0) {
              throw new Error(
                `Encountered ${itemsWithoutKeys.length} item(s) without Key field in S3 list response. Cannot proceed with deletion.`
              )
            }

            // Batch delete (up to 1000 objects per request)
            // Include VersionId to delete specific versions and delete markers
            const objectsToDelete = allItems.map((item) => ({
              Key: item.Key!,
              VersionId: item.VersionId,
            }))

            console.log(`[deleteAll] Deleting batch of ${objectsToDelete.length} items from bucket ${containerName}`)

            const deleteResponse = await s3.send(
              new DeleteObjectsCommand({
                Bucket: containerName,
                Delete: { Objects: objectsToDelete },
              })
            )

            const deletedCount = deleteResponse.Deleted?.length ?? 0
            totalDeleted += deletedCount

            console.log(`[deleteAll] Successfully deleted ${deletedCount} items. Total so far: ${totalDeleted}`)

            // Check for errors
            if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
              console.error(`[deleteAll] Errors during deletion:`, deleteResponse.Errors)
              const errorKeys = deleteResponse.Errors.map((e) => e.Key).join(", ")
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to delete some objects: ${errorKeys}`,
              })
            }

            // If there are more objects in this batch (pagination), continue with the next page
            if (listResponse.IsTruncated) {
              const currentMarkerKey = `${keyMarker || ""}:${versionIdMarker || ""}`
              const newMarkerKey = `${listResponse.NextKeyMarker || ""}:${listResponse.NextVersionIdMarker || ""}`

              // Detect stall: markers not advancing
              if (currentMarkerKey === newMarkerKey) {
                sameMarkerCount++
                if (sameMarkerCount >= MAX_SAME_MARKER) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Pagination stalled: markers not advancing after ${MAX_SAME_MARKER} iterations. The bucket may still contain objects.`,
                  })
                }
              } else {
                sameMarkerCount = 0 // Reset counter when markers advance
              }

              keyMarker = listResponse.NextKeyMarker
              versionIdMarker = listResponse.NextVersionIdMarker
            } else {
              // No more pages, but we need to list again from the beginning to catch any new delete markers
              // that may have been created. Reset markers to start from the beginning.
              keyMarker = undefined
              versionIdMarker = undefined
              sameMarkerCount = 0 // Reset stall counter when resetting markers
            }
          }

          console.log(`[deleteAll] Completed. Total deleted: ${totalDeleted}`)
        } else {
          // New behavior: Delete only current object versions (not all versions/delete markers)
          // Use ListObjectsV2 to get only current versions
          let continuationToken: string | undefined

          do {
            const listResponse = await s3.send(
              new ListObjectsV2Command({
                Bucket: containerName,
                MaxKeys: S3_MAX_KEYS_PER_REQUEST,
                ContinuationToken: continuationToken,
              })
            )

            const objects = listResponse.Contents ?? []

            console.log(`[deleteAll] Found ${objects.length} current objects to delete`)

            if (objects.length === 0) {
              console.log(`[deleteAll] No more current objects to delete`)
              break
            }

            // Validate all items have keys before deletion
            const objectsWithoutKeys = objects.filter((obj) => !obj.Key)
            if (objectsWithoutKeys.length > 0) {
              throw new Error(
                `Encountered ${objectsWithoutKeys.length} object(s) without Key field in S3 list response. Cannot proceed with deletion.`
              )
            }

            // Batch delete current versions only (no VersionId = delete current version)
            const objectsToDelete = objects.map((obj) => ({
              Key: obj.Key!,
            }))

            console.log(
              `[deleteAll] Deleting batch of ${objectsToDelete.length} current objects from bucket ${containerName}`
            )

            const deleteResponse = await s3.send(
              new DeleteObjectsCommand({
                Bucket: containerName,
                Delete: { Objects: objectsToDelete },
              })
            )

            const deletedCount = deleteResponse.Deleted?.length ?? 0
            totalDeleted += deletedCount

            console.log(`[deleteAll] Successfully deleted ${deletedCount} objects. Total so far: ${totalDeleted}`)

            // Check for errors
            if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
              console.error(`[deleteAll] Errors during deletion:`, deleteResponse.Errors)
              const errorKeys = deleteResponse.Errors.map((e) => e.Key).join(", ")
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to delete some objects: ${errorKeys}`,
              })
            }

            continuationToken = listResponse.NextContinuationToken
          } while (continuationToken)

          console.log(`[deleteAll] Completed. Total deleted: ${totalDeleted} current objects`)
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
   * For folders (keys ending with "/"), recursively deletes all objects inside the folder
   * first, then deletes the folder marker itself. This ensures that in versioned buckets,
   * the entire folder content gets delete markers, not just the folder object.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure.input(deleteObjectInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient!()
    const { containerName, objectKey } = input

    try {
      // Check if this is a folder (ends with "/")
      const isFolder = objectKey.endsWith("/")

      if (isFolder) {
        // Recursively delete all objects inside the folder first
        let continuationToken: string | undefined
        let totalDeleted = 0

        do {
          // List all objects with this prefix (without delimiter to get ALL nested objects)
          const listResponse = await s3.send(
            new ListObjectsV2Command({
              Bucket: containerName,
              Prefix: objectKey,
              MaxKeys: S3_MAX_KEYS_PER_REQUEST,
              ContinuationToken: continuationToken,
            })
          )

          const objects = listResponse.Contents ?? []

          // Filter out the folder marker itself - we'll delete it last
          const objectsToDelete = objects.filter((obj) => obj.Key !== objectKey)

          if (objectsToDelete.length > 0) {
            // Batch delete the objects
            const deleteResponse = await s3.send(
              new DeleteObjectsCommand({
                Bucket: containerName,
                Delete: {
                  Objects: objectsToDelete.map((obj) => ({ Key: obj.Key! })),
                },
              })
            )

            totalDeleted += deleteResponse.Deleted?.length ?? 0

            // Check for errors
            if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
              console.error(`[delete folder] Errors during batch deletion:`, deleteResponse.Errors)
              const errorKeys = deleteResponse.Errors.map((e) => e.Key).join(", ")
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to delete some objects in folder: ${errorKeys}`,
              })
            }
          }

          continuationToken = listResponse.NextContinuationToken
        } while (continuationToken)

        console.log(`[delete folder] Deleted ${totalDeleted} objects from folder ${objectKey}`)
      }

      // Delete the object itself (or folder marker after deleting contents)
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
   * throws an error to indicate the incomplete move (object exists in both locations).
   *
   * @throws TRPCError NOT_FOUND - source object or bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   * @throws TRPCError INTERNAL_SERVER_ERROR - copy succeeded but delete failed
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
        // Log and throw - the move is incomplete (object exists in both locations)
        console.error("Move operation: copy succeeded but delete failed", {
          sourceBucket,
          sourceKey,
          destinationBucket,
          destinationKey,
          error: deleteError,
        })
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Object was copied to ${destinationBucket}/${destinationKey} but failed to delete from source: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
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
        // Fetch current object details to preserve system headers
        const headResponse = await s3.send(
          new HeadObjectCommand({
            Bucket: containerName,
            Key: objectKey,
          })
        )

        // Copy object to itself with new metadata, preserving system headers
        await s3.send(
          new CopyObjectCommand({
            CopySource: `/${containerName}/${encodeURIComponent(objectKey)}`,
            Bucket: containerName,
            Key: objectKey,
            MetadataDirective: "REPLACE",
            Metadata: cleanedMetadata,
            // Preserve system headers that would otherwise be lost with REPLACE
            ContentType: headResponse.ContentType,
            ContentEncoding: headResponse.ContentEncoding,
            ContentDisposition: headResponse.ContentDisposition,
            ContentLanguage: headResponse.ContentLanguage,
            CacheControl: headResponse.CacheControl,
            Expires: headResponse.Expires,
            WebsiteRedirectLocation: headResponse.WebsiteRedirectLocation,
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

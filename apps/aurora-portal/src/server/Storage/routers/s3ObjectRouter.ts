import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3"
import { s3ProtectedProcedure } from "../s3Procedure"
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
} from "../types/s3"

export const s3ObjectRouter = {
  /**
   * List objects in a bucket with optional prefix filtering and pagination.
   * Returns both objects and "folders" (CommonPrefixes).
   */
  list: s3ProtectedProcedure.input(listObjectsInputSchema).query(async ({ ctx, input }): Promise<ListObjectsOutput> => {
    const s3 = ctx.getS3Client!()
    const { bucketName, prefix, delimiter = "/", maxKeys, continuationToken } = input

    try {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
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
        bucket: bucketName,
      })
    }
  }),

  /**
   * Get detailed metadata for a specific object.
   */
  getDetails: s3ProtectedProcedure
    .input(getObjectDetailsInputSchema)
    .query(async ({ ctx, input }): Promise<S3ObjectDetails> => {
      const s3 = ctx.getS3Client!()
      const { bucketName, objectKey } = input

      try {
        const response = await s3.send(
          new HeadObjectCommand({
            Bucket: bucketName,
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
          bucket: bucketName,
          key: objectKey,
        })
      }
    }),
}

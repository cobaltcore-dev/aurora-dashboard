import { ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3"
import { s3ProtectedProcedure } from "../s3Procedure"
import { mapS3ErrorToTRPCError } from "../helpers/s3ErrorMapper"
import {
  bucketSchema,
  bucketDetailsSchema,
  listBucketsInputSchema,
  getBucketDetailsInputSchema,
  type Bucket,
  type BucketDetails,
} from "../types/s3"

export const s3BucketRouter = {
  list: s3ProtectedProcedure.input(listBucketsInputSchema).query(async ({ ctx }): Promise<Bucket[]> => {
    const s3 = ctx.getS3Client()

    try {
      const response = await s3.send(new ListBucketsCommand({}))
      return (response.Buckets ?? []).map((b) =>
        bucketSchema.parse({
          name: b.Name ?? "",
          creationDate: b.CreationDate?.toISOString(),
        })
      )
    } catch (error) {
      mapS3ErrorToTRPCError(error, { operation: "list buckets" })
    }
  }),

  getDetails: s3ProtectedProcedure
    .input(getBucketDetailsInputSchema)
    .query(async ({ ctx, input }): Promise<BucketDetails> => {
      const s3 = ctx.getS3Client()
      const { bucketName } = input

      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }))

        return bucketDetailsSchema.parse({
          name: bucketName,
        })
      } catch (error) {
        mapS3ErrorToTRPCError(error, { operation: "get bucket details", bucket: bucketName })
      }
    }),
}

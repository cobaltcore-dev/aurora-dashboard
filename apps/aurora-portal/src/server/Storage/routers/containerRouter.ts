import { ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3"
import { cephProtectedProcedure, cephProcedure } from "../cephProcedure"
import { mapS3ErrorToTRPCError } from "../helpers/s3ErrorMapper"
import { projectScopedInputSchema } from "../../trpc"
import {
  containerSchema,
  containerDetailsSchema,
  listContainersInputSchema,
  getContainerDetailsInputSchema,
  type Container,
  type ContainerDetails,
  type S3Status,
} from "../types/ceph"

export const containerRouter = {
  status: cephProcedure.input(projectScopedInputSchema).query(async ({ ctx }): Promise<S3Status> => {
    return { hasCredentials: !!ctx.cephCredentials }
  }),

  list: cephProtectedProcedure.input(listContainersInputSchema).query(async ({ ctx }): Promise<Container[]> => {
    const s3 = ctx.getCephClient()

    try {
      const response = await s3.send(new ListBucketsCommand({}))
      return (response.Buckets ?? []).map((b) =>
        containerSchema.parse({
          name: b.Name ?? "",
          creationDate: b.CreationDate?.toISOString(),
        })
      )
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, { operation: "list containers" })
    }
  }),

  getDetails: cephProtectedProcedure
    .input(getContainerDetailsInputSchema)
    .query(async ({ ctx, input }): Promise<ContainerDetails> => {
      const s3 = ctx.getCephClient()
      const { containerName } = input

      try {
        await s3.send(new HeadBucketCommand({ Bucket: containerName }))

        return containerDetailsSchema.parse({
          name: containerName,
        })
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, { operation: "get container details", bucket: containerName })
      }
    }),
}

import { GetBucketPolicyCommand, PutBucketPolicyCommand, DeleteBucketPolicyCommand } from "@aws-sdk/client-s3"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { cephProtectedProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import {
  getBucketPolicyInputSchema,
  setBucketPolicyInputSchema,
  deleteBucketPolicyInputSchema,
  bucketPolicyDocumentSchema,
  type GetBucketPolicyOutput,
} from "../../types/ceph"

/**
 * tRPC router for S3 bucket policy operations.
 *
 * Provides endpoints for:
 * - Getting the current bucket policy
 * - Setting (creating/replacing) a bucket policy
 * - Deleting a bucket policy
 *
 * All procedures require EC2 credentials (enforced by cephProtectedProcedure).
 */
export const bucketPolicyRouter = {
  /**
   * Get the current bucket policy.
   *
   * Returns the policy as both a parsed object and raw JSON string.
   * Returns null if no policy is set (not an error).
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  get: cephProtectedProcedure
    .input(getBucketPolicyInputSchema)
    .query(async ({ ctx, input }): Promise<GetBucketPolicyOutput> => {
      const s3 = ctx.getCephClient()
      const { bucketName } = input

      try {
        const response = await s3.send(
          new GetBucketPolicyCommand({
            Bucket: bucketName,
          })
        )

        // S3 returns policy as JSON string
        const policyText = response.Policy ?? null

        if (!policyText) {
          return { policy: null, policyText: null }
        }

        // Parse and validate
        const policyObj = JSON.parse(policyText)
        const policy = bucketPolicyDocumentSchema.parse(policyObj)

        return { policy, policyText }
      } catch (error) {
        // NoSuchBucketPolicy is not an error - it means no policy set
        const s3Error = error as { name?: string; Code?: string }
        if (s3Error.name === "NoSuchBucketPolicy" || s3Error.Code === "NoSuchBucketPolicy") {
          return { policy: null, policyText: null }
        }

        throw mapS3ErrorToTRPCError(error, {
          operation: "get bucket policy",
          bucket: bucketName,
        })
      }
    }),

  /**
   * Set (create or replace) a bucket policy.
   *
   * Accepts a policy document as a JSON string. Validates structure before
   * sending to S3. Replaces any existing policy completely.
   *
   * @throws TRPCError BAD_REQUEST - invalid policy JSON or structure
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  set: cephProtectedProcedure.input(setBucketPolicyInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName, policy } = input

    try {
      // Validate JSON structure before sending to S3
      const policyObj = JSON.parse(policy)
      const validatedPolicy = bucketPolicyDocumentSchema.parse(policyObj)

      // S3 expects policy as JSON string
      const policyText = JSON.stringify(validatedPolicy)

      await s3.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: policyText,
        })
      )

      return true
    } catch (error) {
      // JSON parse error or zod validation error
      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid policy JSON structure",
          cause: error,
        })
      }

      throw mapS3ErrorToTRPCError(error, {
        operation: "set bucket policy",
        bucket: bucketName,
      })
    }
  }),

  /**
   * Delete (remove) a bucket policy.
   *
   * Removes the policy from the bucket. The bucket reverts to having no policy.
   * Not an error if no policy was set.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure
    .input(deleteBucketPolicyInputSchema)
    .mutation(async ({ ctx, input }): Promise<boolean> => {
      const s3 = ctx.getCephClient()
      const { bucketName } = input

      try {
        await s3.send(
          new DeleteBucketPolicyCommand({
            Bucket: bucketName,
          })
        )

        return true
      } catch (error) {
        // NoSuchBucketPolicy is not an error - idempotent delete
        const s3Error = error as { name?: string; Code?: string }
        if (s3Error.name === "NoSuchBucketPolicy" || s3Error.Code === "NoSuchBucketPolicy") {
          return true
        }

        throw mapS3ErrorToTRPCError(error, {
          operation: "delete bucket policy",
          bucket: bucketName,
        })
      }
    }),
}

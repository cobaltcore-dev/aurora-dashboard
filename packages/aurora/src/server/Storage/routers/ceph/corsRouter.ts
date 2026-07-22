import { GetBucketCorsCommand, PutBucketCorsCommand, DeleteBucketCorsCommand } from "@aws-sdk/client-s3"
import { cephProtectedProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import { getCorsInputSchema, setCorsInputSchema, deleteCorsInputSchema, corsRuleSchema } from "../../types/ceph"
import type { GetCorsOutput } from "../../types/ceph"

/**
 * tRPC router for S3 bucket CORS (Cross-Origin Resource Sharing) operations.
 *
 * Provides endpoints for:
 * - Getting the current CORS configuration
 * - Setting (creating/replacing) a CORS configuration
 * - Deleting a CORS configuration
 *
 * All procedures require EC2 credentials (enforced by cephProtectedProcedure).
 *
 * CORS controls which browser origins can access bucket content via JavaScript.
 * Essential for single-page applications, web-based uploads, and cross-domain hosting.
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html
 * @see https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#put-bucket-cors
 */
export const corsRouter = {
  /**
   * Get the current CORS configuration for a bucket.
   *
   * Returns an array of CORS rules, or null if no CORS configuration is set.
   * Not having a CORS configuration is a normal state (not an error).
   *
   * @returns { corsRules: CorsRule[] | null }
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  get: cephProtectedProcedure.input(getCorsInputSchema).query(async ({ ctx, input }): Promise<GetCorsOutput> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      const response = await s3.send(
        new GetBucketCorsCommand({
          Bucket: bucketName,
        })
      )

      // S3 returns CORSRules array or undefined
      const rawCorsRules = response.CORSRules ?? null

      if (!rawCorsRules) {
        return { corsRules: null }
      }

      // Validate and type-check the CORS rules using Zod schema
      const corsRules = rawCorsRules.map((rule) => corsRuleSchema.parse(rule))

      return { corsRules }
    } catch (error) {
      // NoSuchCORSConfiguration is not an error - it means no CORS config set
      const s3Error = error as { name?: string; Code?: string }
      if (s3Error.name === "NoSuchCORSConfiguration" || s3Error.Code === "NoSuchCORSConfiguration") {
        return { corsRules: null }
      }

      throw mapS3ErrorToTRPCError(error, {
        operation: "get CORS configuration",
        bucket: bucketName,
      })
    }
  }),

  /**
   * Set (create or replace) a CORS configuration for a bucket.
   *
   * Accepts a CORS configuration with an array of rules. Validates structure
   * before sending to S3. Replaces any existing CORS configuration completely.
   *
   * Rules are validated for:
   * - At least 1 AllowedMethod, maximum 5
   * - At least 1 AllowedOrigin
   * - MaxAgeSeconds: 0-86400 (24 hours)
   * - ID: max 255 characters
   * - Total rules: 1-100 per bucket
   *
   * @returns { success: boolean }
   * @throws TRPCError BAD_REQUEST - invalid CORS configuration structure
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  set: cephProtectedProcedure.input(setCorsInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName, corsConfiguration } = input

    try {
      await s3.send(
        new PutBucketCorsCommand({
          Bucket: bucketName,
          CORSConfiguration: corsConfiguration,
        })
      )

      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "set CORS configuration",
        bucket: bucketName,
      })
    }
  }),

  /**
   * Delete (remove) a CORS configuration from a bucket.
   *
   * Removes all CORS rules from the bucket. The bucket reverts to having no CORS config.
   * Not an error if no CORS configuration was set (idempotent).
   *
   * @returns { success: boolean }
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure.input(deleteCorsInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      await s3.send(
        new DeleteBucketCorsCommand({
          Bucket: bucketName,
        })
      )

      return true
    } catch (error) {
      // NoSuchCORSConfiguration is not an error - idempotent delete
      const s3Error = error as { name?: string; Code?: string }
      if (s3Error.name === "NoSuchCORSConfiguration" || s3Error.Code === "NoSuchCORSConfiguration") {
        return true
      }

      throw mapS3ErrorToTRPCError(error, {
        operation: "delete CORS configuration",
        bucket: bucketName,
      })
    }
  }),
}

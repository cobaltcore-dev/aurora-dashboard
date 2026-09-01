import {
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  DeleteBucketLifecycleCommand,
  type LifecycleRule as AwsSdkLifecycleRule,
} from "@aws-sdk/client-s3"
import { TRPCError } from "@trpc/server"
import { cephProtectedProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import {
  getLifecycleInputSchema,
  setLifecycleInputSchema,
  deleteLifecycleInputSchema,
  lifecycleRuleReadSchema,
} from "../../types/ceph"
import type { GetLifecycleOutput, LifecycleRuleRead } from "../../types/ceph"
import { toSdkLifecycleRules, toWireLifecycleRule } from "../../helpers/lifecycleMapper"

// Rate limiting for lifecycle operations: 10 sets per minute per bucket
const lifecycleSetRateLimits = new Map<string, { count: number; resetAt: number }>()

function checkLifecycleSetRateLimit(bucketName: string, projectId: string): void {
  const key = `${projectId}:${bucketName}`
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute

  const limit = lifecycleSetRateLimits.get(key)

  if (!limit || now >= limit.resetAt) {
    lifecycleSetRateLimits.set(key, { count: 1, resetAt: now + windowMs })
    // Self-clean this one key after its window closes — O(1) per key, no full-map scan.
    setTimeout(() => {
      const current = lifecycleSetRateLimits.get(key)
      // Only delete if this timer's entry is still the current one (a newer window may have
      // started for the same key before this stale timer fired).
      if (current && current.resetAt <= Date.now()) {
        lifecycleSetRateLimits.delete(key)
      }
    }, windowMs).unref()
    return
  }

  if (limit.count >= 10) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Lifecycle modification rate limit exceeded. Maximum 10 lifecycle changes per minute per bucket.",
    })
  }

  limit.count++
}

/**
 * tRPC router for S3 bucket lifecycle configuration operations.
 *
 * Provides endpoints for:
 * - Getting the current lifecycle configuration
 * - Setting (creating/replacing) a lifecycle configuration
 * - Deleting a lifecycle configuration
 *
 * All procedures require EC2 credentials (enforced by cephProtectedProcedure).
 *
 * Lifecycle rules automate object management:
 * - Expire (delete) objects after N days
 * - Transition objects to different storage classes
 * - Clean up old versions in versioned buckets
 * - Abort incomplete multipart uploads
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
 * @see https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#put-bucket-lifecycle
 */
export const lifecycleRouter = {
  /**
   * Get the current lifecycle configuration for a bucket.
   *
   * Returns an array of lifecycle rules, or null if no lifecycle configuration is set.
   * Not having a lifecycle configuration is a normal state (not an error).
   *
   * Rules are mapped and validated individually  a rule that fails the lenient read schema
   * (e.g. authored outside Aurora) is skipped rather than failing the whole response;
   * `skippedRuleCount` reports how many were skipped so the client can warn and disable mutations.
   *
   * @returns { rules: LifecycleRule[] | null; skippedRuleCount: number }
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  get: cephProtectedProcedure
    .input(getLifecycleInputSchema)
    .query(async ({ ctx, input }): Promise<GetLifecycleOutput> => {
      const s3 = ctx.getCephClient()
      const { bucketName } = input

      try {
        const response = await s3.send(
          new GetBucketLifecycleConfigurationCommand({
            Bucket: bucketName,
          })
        )

        // S3 returns Rules array or undefined
        const rawRules = response.Rules ?? null

        if (!rawRules) {
          return { rules: null, skippedRuleCount: 0 }
        }

        // Map + validate each rule independently: a single rule that fails the lenient read schema
        // (e.g. an externally-authored rule missing a required field) must not take down the whole
        // response. Skipped rules are tracked via skippedRuleCount so the client can warn and disable
        // mutations  set is a full replace, and silently dropping a rule here would delete it on save.
        const rules: LifecycleRuleRead[] = []
        let skippedRuleCount = 0
        for (const rawRule of rawRules) {
          try {
            const parsed = lifecycleRuleReadSchema.safeParse(toWireLifecycleRule(rawRule))
            if (parsed.success) {
              rules.push(parsed.data)
              continue
            }
            skippedRuleCount++
          } catch {
            skippedRuleCount++
          }
        }

        return { rules, skippedRuleCount }
      } catch (error) {
        // NoSuchLifecycleConfiguration is not an error - it means no lifecycle config set
        const s3Error = error as { name?: string; Code?: string }
        if (s3Error.name === "NoSuchLifecycleConfiguration" || s3Error.Code === "NoSuchLifecycleConfiguration") {
          return { rules: null, skippedRuleCount: 0 }
        }

        throw mapS3ErrorToTRPCError(error, {
          operation: "get lifecycle configuration",
          bucket: bucketName,
        })
      }
    }),

  /**
   * Set (create or replace) a lifecycle configuration for a bucket.
   *
   * Accepts a lifecycle configuration with an array of rules. Validates structure
   * before sending to S3. Replaces any existing lifecycle configuration completely.
   *
   * Rules are validated for:
   * - At least one action (Expiration, Transition, NoncurrentVersion, or AbortIncompleteMultipartUpload)
   * - ID: max 255 characters (optional)
   * - Filter: proper structure for Prefix, Tag, ObjectSize conditions
   * - Total rules: 1-100 per bucket
   *
   * @returns boolean - true on success
   * @throws TRPCError BAD_REQUEST - invalid lifecycle configuration structure
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   * @throws TRPCError TOO_MANY_REQUESTS - rate limit exceeded (10 changes per minute per bucket)
   */
  set: cephProtectedProcedure.input(setLifecycleInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName, lifecycleConfiguration, project_id } = input

    // Check rate limit before making the S3 call
    checkLifecycleSetRateLimit(bucketName, project_id)

    // Use lifecycleMapper to convert wire format → SDK format
    // - Converts ISO date strings to Date objects
    // - Normalizes Expiration.Date to midnight UTC (AWS requirement)
    // - Migrates legacy Prefix to Filter.Prefix if needed
    // - Preserves Transitions[].Date as-is (no normalization)
    const transformedRules = toSdkLifecycleRules(lifecycleConfiguration.Rules).map((rule) => {
      const transformed: AwsSdkLifecycleRule = { ...rule }

      // Migrate legacy Prefix to Filter.Prefix if needed (never send both to S3)
      if (transformed.Prefix !== undefined && transformed.Filter === undefined) {
        transformed.Filter = { Prefix: transformed.Prefix }
      }
      // Always clear legacy Prefix field (one-way migration to Filter)
      delete transformed.Prefix

      return transformed
    })

    try {
      await s3.send(
        new PutBucketLifecycleConfigurationCommand({
          Bucket: bucketName,
          LifecycleConfiguration: {
            Rules: transformedRules,
          },
        })
      )

      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "set lifecycle configuration",
        bucket: bucketName,
      })
    }
  }),

  /**
   * Delete (remove) a lifecycle configuration from a bucket.
   *
   * Removes all lifecycle rules from the bucket. The bucket reverts to having no lifecycle config.
   * Not an error if no lifecycle configuration was set (idempotent).
   *
   * @returns boolean - true on success
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure
    .input(deleteLifecycleInputSchema)
    .mutation(async ({ ctx, input }): Promise<boolean> => {
      const s3 = ctx.getCephClient()
      const { bucketName } = input

      try {
        await s3.send(
          new DeleteBucketLifecycleCommand({
            Bucket: bucketName,
          })
        )

        return true
      } catch (error) {
        // NoSuchLifecycleConfiguration is not an error - idempotent delete
        const s3Error = error as { name?: string; Code?: string }
        if (s3Error.name === "NoSuchLifecycleConfiguration" || s3Error.Code === "NoSuchLifecycleConfiguration") {
          return true
        }

        throw mapS3ErrorToTRPCError(error, {
          operation: "delete lifecycle configuration",
          bucket: bucketName,
        })
      }
    }),
}

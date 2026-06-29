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
  type BucketPolicyDocument,
} from "../../types/ceph"

// Rate limiting for policy operations: 10 sets per 5 minutes per bucket
const policySetRateLimits = new Map<string, { count: number; resetAt: number }>()

function checkPolicySetRateLimit(bucketName: string, projectId: string): void {
  const key = `${projectId}:${bucketName}`
  const now = Date.now()
  const windowMs = 5 * 60 * 1000 // 5 minutes

  // Clean up expired entries to prevent unbounded memory growth
  for (const [k, v] of policySetRateLimits.entries()) {
    if (now > v.resetAt) {
      policySetRateLimits.delete(k)
    }
  }

  const limit = policySetRateLimits.get(key)

  if (!limit || now > limit.resetAt) {
    policySetRateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (limit.count >= 10) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Policy modification rate limit exceeded. Maximum 10 policy changes per 5 minutes per bucket.",
    })
  }

  limit.count++
}

/**
 * Validates that all Resource ARNs in a policy match the target bucket.
 * Prevents policy confusion attacks where a policy on bucket-A references bucket-B.
 */
function validateResourceARNsMatchBucket(policy: BucketPolicyDocument, bucketName: string): void {
  for (const statement of policy.Statement) {
    // Skip if no Resource (could be using NotResource instead)
    if (!statement.Resource) continue

    const resources = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource]

    for (const resource of resources) {
      // ARN format: arn:aws:s3:::bucket-name or arn:aws:s3:::bucket-name/*
      const arnRegex = /^arn:aws:s3:::([^/]+)/
      const match = resource.match(arnRegex)

      // Reject resources that don't match S3 bucket ARN pattern (includes "*" and non-S3 ARNs)
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Policy Resource '${resource}' is not a valid S3 bucket ARN for bucket '${bucketName}'. Expected: arn:aws:s3:::${bucketName} or arn:aws:s3:::${bucketName}/*`,
        })
      }

      // Reject resources that reference a different bucket
      if (match[1] !== bucketName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Policy Resource ARN '${resource}' does not match bucket '${bucketName}'`,
        })
      }
    }
  }
}

/**
 * Validates policy semantics to prevent dangerous configurations.
 */
function validatePolicySemantics(policy: BucketPolicyDocument): void {
  // Check statement count (AWS limit is 100)
  if (policy.Statement.length > 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Policy exceeds maximum of 100 statements",
    })
  }

  // Warn about deny-all statements that could lock out the owner
  const denyAllStatement = policy.Statement.find((s) => {
    if (s.Effect !== "Deny") return false
    const actions = Array.isArray(s.Action) ? s.Action : [s.Action]
    return actions.some((a) => a === "*" || a === "s3:*")
  })

  if (denyAllStatement) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Policy contains 'Deny *' or 'Deny s3:*' which may lock out all access including the bucket owner. Please use more specific deny rules.",
    })
  }
}

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

    // Rate limit policy modifications
    checkPolicySetRateLimit(bucketName, input.project_id)

    // Enforce policy size limit (AWS max is 20KB)
    if (policy.length > 20480) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Policy document exceeds maximum size of 20KB",
      })
    }

    // Check JSON nesting depth to prevent CPU exhaustion
    const openBrackets = (policy.match(/[{[]/g) || []).length
    if (openBrackets > 50) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Policy JSON is too deeply nested (maximum 50 levels)",
      })
    }

    try {
      // Validate JSON structure before sending to S3
      const policyObj = JSON.parse(policy)
      const validatedPolicy = bucketPolicyDocumentSchema.parse(policyObj)

      // Validate Resource ARNs match the target bucket
      validateResourceARNsMatchBucket(validatedPolicy, bucketName)

      // Validate policy semantics (statement count, dangerous patterns)
      validatePolicySemantics(validatedPolicy)

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
      if (error instanceof SyntaxError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid JSON format",
        })
      }

      if (error instanceof z.ZodError) {
        // Format Zod errors into human-readable messages
        const zodError = error as z.ZodError
        const firstError = zodError.issues?.[0]
        if (!firstError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid policy structure",
          })
        }

        // Convert path to human-readable format (e.g., "Statement.0" -> "Statement 1")
        const formatPath = (path: readonly (string | number)[]): string => {
          if (path.length === 0) return ""
          return (
            path
              .map((segment, index) => {
                if (typeof segment === "number") {
                  // Convert 0-based index to 1-based for humans
                  return `${segment + 1}`
                }
                // Add space before segment if previous was a number
                const prev = path[index - 1]
                return typeof prev === "number" ? ` ${segment}` : segment
              })
              .join(" ") + ": "
          )
        }

        const path = formatPath(firstError.path as (string | number)[])
        const message = firstError.message || "Invalid policy structure"

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${path}${message}`,
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

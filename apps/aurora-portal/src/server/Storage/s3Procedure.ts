import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_S3_CREDENTIALS = "NO_S3_CREDENTIALS" as const

function resolveS3Config(ctx: AuroraPortalContext): { endpoint?: string; region: string } {
  const region = process.env.CEPH_REGION || "default"

  // Try to get endpoint from Ceph service catalog
  try {
    const service = ctx.openstack?.service("ceph")
    const endpoint = service?.getEndpoint?.()

    if (endpoint) {
      // Extract base URL by removing Swift path
      // Ceph RGW serves both Swift and S3 APIs on the same host
      // Swift: https://rgw.st1.qa-de-1.cloud.sap/swift/v1/AUTH_xxx
      // S3:    https://rgw.st1.qa-de-1.cloud.sap
      const swiftIndex = endpoint.indexOf("/swift/")

      if (swiftIndex !== -1) {
        return { endpoint: endpoint.substring(0, swiftIndex), region }
      }

      // Already a base URL without Swift path
      return { endpoint, region }
    }
  } catch (error) {
    // Ceph service not available in catalog, fall through to env fallback
    console.warn("[s3] Failed to resolve Ceph service from catalog:", error)
  }

  // Fallback to environment variables
  return { endpoint: process.env.CEPH_S3_ENDPOINT, region }
}

/**
 * Base S3 middleware - resolves EC2 credentials and S3 config, but does NOT throw on missing credentials.
 * Adds to context:
 *   - s3Credentials: EC2CredentialResult | null
 *   - getS3Client: () => S3Client - throws FORBIDDEN if credentials missing
 *
 * Use this for procedures that need to check credential status without failing.
 * Note: getS3Client() throws TRPCError when called without credentials.
 */
const s3CredentialMiddleware = projectScopedProcedure.use(async function resolveS3(opts) {
  const { ctx, next } = opts
  const credentials = await resolveEC2Credential(ctx)
  const { endpoint, region } = resolveS3Config(ctx)

  return next({
    ctx: {
      ...ctx,
      s3Credentials: credentials,
      getS3Client: (): S3Client => {
        if (!credentials) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: NO_S3_CREDENTIALS,
          })
        }
        return createS3Client(credentials.access, credentials.secret, endpoint, region)
      },
    },
  })
})

/**
 * Base procedure with S3 credentials resolved (may be null).
 * For status checks or other operations that handle missing credentials gracefully.
 */
export const s3Procedure = s3CredentialMiddleware

/**
 * Protected procedure - requires EC2 credentials to exist.
 * Throws FORBIDDEN with NO_S3_CREDENTIALS if credentials not found.
 * For actual S3 operations (list buckets, get objects, etc).
 */
export const s3ProtectedProcedure = s3CredentialMiddleware.use(async function requireCredentials(opts) {
  const { ctx, next } = opts

  if (!ctx.s3Credentials) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NO_S3_CREDENTIALS,
    })
  }

  return next({ ctx })
})

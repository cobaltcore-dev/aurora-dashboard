import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_S3_CREDENTIALS = "NO_S3_CREDENTIALS" as const

function resolveS3Config(ctx: AuroraPortalContext): { endpoint?: string; region: string } {
  // Try S3-compatible service types in priority order
  for (const serviceType of ["s3", "object-store-ceph", "ceph"]) {
    try {
      const service = ctx.openstack?.service(serviceType)
      const endpoint = service?.getEndpoint?.()

      if (endpoint) {
        // Skip Swift URLs (contain /swift/ or /v1/AUTH_)
        if (endpoint.includes("/swift/") || endpoint.includes("/v1/AUTH_")) {
          console.log(`[s3] skipping Swift endpoint (${serviceType}): ${endpoint}`)
          continue
        }

        // Use region from env var (service.getEndpoint doesn't return region)
        const region = process.env.CEPH_REGION || "default"
        console.log(`[s3] resolved from catalog (${serviceType}): endpoint=${endpoint}, region=${region}`)
        return { endpoint, region }
      }
    } catch {
      // Service not available in catalog
      console.log(`[s3] service ${serviceType} not available`)
      continue
    }
  }

  // Fallback to environment variables
  const fallback = process.env.CEPH_S3_ENDPOINT
  const fallbackRegion = process.env.CEPH_REGION || "default"
  console.log("[s3] using env fallback: endpoint=", fallback, "region=", fallbackRegion)
  return { endpoint: fallback, region: fallbackRegion }
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

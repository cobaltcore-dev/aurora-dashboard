import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_CEPH_CREDENTIALS = "NO_CEPH_CREDENTIALS" as const

function resolveS3Config(ctx: AuroraPortalContext): { endpoint: string; region: string } {
  // Region is not used by Ceph RGW, but required by AWS SDK
  // Use a default constant value
  const region = "default"

  // Get endpoint from Ceph service catalog
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
    console.error("[ceph] Failed to resolve Ceph service from catalog:", error)
    throw new Error("Ceph service not found in catalog. Ensure the Ceph service is registered in OpenStack.", {
      cause: error,
    })
  }

  throw new Error("Ceph service endpoint not found in catalog. Ensure the Ceph service is registered in OpenStack.")
}

/**
 * Base Ceph middleware - resolves EC2 credentials and S3 config, but does NOT throw on missing credentials.
 * Adds to context:
 *   - cephCredentials: EC2CredentialResult | null
 *   - getCephClient: () => S3Client - throws FORBIDDEN if credentials missing
 *
 * Use this for procedures that need to check credential status without failing.
 * Note: getCephClient() throws TRPCError when called without credentials.
 */
const cephCredentialMiddleware = projectScopedProcedure.use(async function resolveCeph(opts) {
  const { ctx, next } = opts
  const credentials = await resolveEC2Credential(ctx)
  const { endpoint, region } = resolveS3Config(ctx)

  return next({
    ctx: {
      ...ctx,
      cephCredentials: credentials,
      getCephClient: (): S3Client => {
        if (!credentials) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: NO_CEPH_CREDENTIALS,
          })
        }
        return createS3Client(credentials.access, credentials.secret, endpoint, region)
      },
    },
  })
})

/**
 * Base procedure with Ceph credentials resolved (may be null).
 * For status checks or other operations that handle missing credentials gracefully.
 */
export const cephProcedure = cephCredentialMiddleware

/**
 * Protected procedure - requires EC2 credentials to exist.
 * Throws FORBIDDEN with NO_CEPH_CREDENTIALS if credentials not found.
 * For actual Ceph S3 operations (list containers, get objects, etc).
 */
export const cephProtectedProcedure = cephCredentialMiddleware.use(async function requireCredentials(opts) {
  const { ctx, next } = opts

  if (!ctx.cephCredentials) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NO_CEPH_CREDENTIALS,
    })
  }

  return next({ ctx })
})

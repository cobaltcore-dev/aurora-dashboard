import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_CEPH_CREDENTIALS = "NO_CEPH_CREDENTIALS" as const

/**
 * Resolves S3 endpoint and region configuration from OpenStack service catalog.
 *
 * Extracts the Ceph RGW endpoint and constructs the appropriate region identifier
 * for AWS SDK operations (signing, bucket creation with LocationConstraint).
 *
 * @param ctx - Aurora Portal context containing OpenStack token and service catalog
 * @returns Object with endpoint URL and Ceph-compatible region identifier
 * @throws Error if OpenStack token, service catalog, Ceph service, or region is not available
 */
function resolveS3Config(ctx: AuroraPortalContext): { endpoint: string; region: string } {
  try {
    const service = ctx.openstack?.service("ceph")

    if (!service) {
      throw new Error("Ceph service not found in OpenStack service catalog")
    }

    const endpoint = service.getEndpoint?.()

    if (!endpoint) {
      throw new Error("Ceph service endpoint not found in catalog. Ensure the Ceph service is registered in OpenStack.")
    }

    // Extract base URL by removing Swift path suffix.
    // Ceph RGW serves both Swift and S3 APIs on the same host but different paths:
    //   Swift: https://rgw.st1.qa-de-1.cloud.sap/swift/v1/AUTH_xxx
    //   S3:    https://rgw.st1.qa-de-1.cloud.sap
    const swiftIndex = endpoint.indexOf("/swift/")
    const baseEndpoint = swiftIndex !== -1 ? endpoint.substring(0, swiftIndex) : endpoint

    const endpoints = service.availableEndpoints?.()
    const openstackRegion = endpoints?.[0]?.region

    if (!openstackRegion) {
      throw new Error("Region not found in Ceph service endpoints")
    }

    // Construct Ceph-compatible region identifier using the pattern from Go SDK / Terraform.
    // Standard format: ceph-objectstore-st1-{region} (e.g., ceph-objectstore-st1-eu-de-2)
    // Exception: qa-de-1 uses "ec" prefix for historical reasons (ceph-objectstore-ec-st1-qa-de-1)
    //
    // This identifier is used for:
    //   1. AWS Signature V4 request signing (region field in Authorization header)
    //   2. LocationConstraint in CreateBucket API calls
    //
    // See: https://documentation.global.cloud.sap/docs/customer/storage/obj-v2-ceph/ceph-storage-options/
    const QA_DE_1_REGION = "qa-de-1"
    const CEPH_REGION_PREFIX_STANDARD = "ceph-objectstore-st1"
    const CEPH_REGION_PREFIX_EC = "ceph-objectstore-ec-st1"

    const region =
      openstackRegion === QA_DE_1_REGION
        ? `${CEPH_REGION_PREFIX_EC}-${openstackRegion}`
        : `${CEPH_REGION_PREFIX_STANDARD}-${openstackRegion}`

    return { endpoint: baseEndpoint, region }
  } catch (error) {
    console.error("[ceph] Failed to resolve Ceph service from catalog:", error)
    throw new Error("Ceph service not found in catalog. Ensure the Ceph service is registered in OpenStack.", {
      cause: error,
    })
  }
}

/**
 * Base Ceph middleware - resolves EC2 credentials and S3 config.
 *
 * Does NOT throw on missing credentials - allows procedures to check credential status gracefully.
 *
 * Adds to context:
 *   - cephCredentials: EC2CredentialResult | null
 *   - cephRegion: string - Ceph-compatible region identifier
 *   - getCephClient: () => S3Client - factory function that throws FORBIDDEN if credentials missing
 *
 * Use this for procedures that need to check credential status without failing immediately.
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
      cephRegion: region,
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
 *
 * Use for status checks or operations that handle missing credentials gracefully.
 */
export const cephProcedure = cephCredentialMiddleware

/**
 * Protected procedure - requires EC2 credentials to exist.
 *
 * Throws FORBIDDEN with NO_CEPH_CREDENTIALS if credentials not found.
 * Use for actual Ceph S3 operations (list buckets, create bucket, delete bucket, etc).
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

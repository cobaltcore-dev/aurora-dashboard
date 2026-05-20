import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_CEPH_CREDENTIALS = "NO_CEPH_CREDENTIALS" as const

function resolveS3Config(ctx: AuroraPortalContext): { endpoint: string; region: string } {
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
      const baseEndpoint = swiftIndex !== -1 ? endpoint.substring(0, swiftIndex) : endpoint

      // Try to get region from OpenStack token's service catalog
      // If the Ceph service has a region defined in the catalog, use it
      const region = process.env.CEPH_REGION || "us-east-1"

      try {
        const token = ctx.openstack?.getToken?.()
        console.log("[ceph] Token available:", !!token)

        if (token?.tokenData?.catalog) {
          console.log("[ceph] Service catalog available with", token.tokenData.catalog.length, "services")

          // Log all available regions from token
          const availableRegions = token.availableRegions
          console.log("[ceph] Available regions from token:", availableRegions)

          // Find Ceph service in catalog
          const cephService = token.tokenData.catalog.find(
            (s) => s.type === "ceph" || s.name === "ceph" || s.type === "object-store" || s.type === "object-store-ceph"
          )

          if (cephService) {
            console.log("[ceph] Found Ceph service in catalog:")
            console.log("  - Service type:", cephService.type)
            console.log("  - Service name:", cephService.name)
            console.log("  - Service ID:", cephService.id)
            console.log("  - Number of endpoints:", cephService.endpoints.length)

            // Log the full service object to see if there's any metadata
            console.log("  - Full service object:", JSON.stringify(cephService, null, 2))

            // Log all Ceph endpoints with their regions
            cephService.endpoints.forEach((ep, index) => {
              console.log(`  - Endpoint ${index + 1}:`)
              console.log(`    - Region: ${ep.region}`)
              console.log(`    - Region ID: ${ep.region_id}`)
              console.log(`    - Interface: ${ep.interface}`)
              console.log(`    - URL: ${ep.url}`)
              console.log(`    - ID: ${ep.id}`)
            })

            // Get region from the first endpoint (they should all be in same region)
            const cephRegion = cephService.endpoints?.[0]?.region

            if (cephRegion) {
              // OpenStack catalog has region info - but we still need "us-east-1" for AWS SDK compatibility
              // Check if there's any AWS-compatible region information in the service metadata
              console.log(
                `[ceph] OpenStack catalog region for Ceph: "${cephRegion}", using AWS-compatible region: "${region}"`
              )
              console.log(
                `[ceph] Note: Ceph RGW doesn't expose AWS region mapping in OpenStack catalog - using hardcoded "${region}"`
              )
            } else {
              console.log("[ceph] No region found in Ceph service endpoints")
            }
          } else {
            console.log("[ceph] Ceph service NOT found in catalog. Available services:")
            token.tokenData.catalog.forEach((s) => {
              console.log(`  - ${s.type} (${s.name})`)
            })
          }
        } else {
          console.log("[ceph] No service catalog in token")
        }
      } catch (tokenError) {
        console.warn("[ceph] Error extracting region from OpenStack token:", tokenError)
      }

      // Ceph RGW doesn't use AWS-style regions for bucket placement
      // Always use "us-east-1" (or CEPH_REGION env var) to prevent AWS SDK from adding LocationConstraint
      // This is standard practice for S3-compatible systems (Ceph RGW, MinIO)
      // The region is used for AWS Signature V4 request signing
      console.log(`[ceph] Final configuration: endpoint="${baseEndpoint}", region="${region}"`)
      return { endpoint: baseEndpoint, region }
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

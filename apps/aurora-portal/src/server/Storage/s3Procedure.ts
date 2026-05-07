import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_S3_CREDENTIALS = "NO_S3_CREDENTIALS" as const

function resolveS3Config(ctx: AuroraPortalContext): { endpoint?: string; region: string } {
  const token = ctx.openstack?.getToken()
  const catalog = token?.tokenData?.catalog
  console.log(
    "[s3] catalog service types:",
    catalog?.map((s: { type: string; name: string }) => `${s.type}/${s.name}`).join(", ")
  )

  // Ceph RGW may appear as type "s3", "object-store-ceph", or "ceph" in the catalog
  // Try in order: s3 (explicit), object-store-ceph, ceph, then object-store (Swift fallback)
  for (const serviceType of ["s3", "object-store-ceph", "ceph", "object-store"]) {
    const service = catalog?.find(
      (s: { type: string; name: string }) => s.type === serviceType || s.name === serviceType
    )
    if (service) {
      const endpoint = service.endpoints.find((e: { interface: string; url: string }) => e.interface === "public")
      if (endpoint) {
        // Skip Swift URLs (contain /swift/ or /v1/AUTH_)
        if (endpoint.url.includes("/swift/") || endpoint.url.includes("/v1/AUTH_")) {
          console.log(`[s3] skipping Swift endpoint (${serviceType}): ${endpoint.url}`)
          continue
        }
        const region =
          (endpoint as { region_id?: string; region?: string }).region_id ||
          (endpoint as { region_id?: string; region?: string }).region ||
          "default"
        console.log(`[s3] resolved from catalog (${serviceType}): endpoint=${endpoint.url}, region=${region}`)
        return { endpoint: endpoint.url, region }
      }
    }
  }

  const fallback = process.env.CEPH_S3_ENDPOINT
  const fallbackRegion = process.env.CEPH_REGION || "default"
  console.log("[s3] using env fallback: endpoint=", fallback, "region=", fallbackRegion)
  return { endpoint: fallback, region: fallbackRegion }
}

/**
 * Base S3 middleware - resolves EC2 credentials and S3 config, but does NOT throw on missing credentials.
 * Adds to context:
 *   - s3Credentials: EC2CredentialResult | null
 *   - getS3Client: () => S3Client | undefined
 *
 * Use this for procedures that need to check credential status without failing.
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

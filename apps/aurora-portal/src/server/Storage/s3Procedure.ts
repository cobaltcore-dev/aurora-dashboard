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
  console.log("[s3] catalog service types:", catalog?.map((s) => `${s.type}/${s.name}`).join(", "))

  // Ceph RGW may appear as type "s3", "object-store-ceph", or "ceph" in the catalog
  // Try in order: s3 (explicit), object-store-ceph, ceph, then object-store (Swift fallback)
  for (const serviceType of ["s3", "object-store-ceph", "ceph", "object-store"]) {
    const service = catalog?.find((s) => s.type === serviceType || s.name === serviceType)
    if (service) {
      const endpoint = service.endpoints.find((e) => e.interface === "public")
      if (endpoint) {
        // Skip Swift URLs (contain /swift/ or /v1/AUTH_)
        if (endpoint.url.includes("/swift/") || endpoint.url.includes("/v1/AUTH_")) {
          console.log(`[s3] skipping Swift endpoint (${serviceType}): ${endpoint.url}`)
          continue
        }
        const region = endpoint.region_id || endpoint.region || "default"
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
 * Extends projectScopedProcedure with EC2 credential resolution.
 * Before every S3 procedure:
 *   - checks if EC2 credentials exist for the current user + project
 *   - if none exist → throws FORBIDDEN with message NO_S3_CREDENTIALS
 *     (frontend catches this globally to show the credential creation prompt)
 *   - if found → adds getS3Client() to ctx
 */
export const s3ProtectedProcedure = projectScopedProcedure.use(async function resolveS3Credentials(opts) {
  const { ctx, next } = opts

  const credentials = await resolveEC2Credential(ctx)

  if (!credentials) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NO_S3_CREDENTIALS,
    })
  }

  const { access, secret } = credentials
  const { endpoint, region } = resolveS3Config(ctx)

  return next({
    ctx: {
      ...ctx,
      getS3Client: (): S3Client => createS3Client(access, secret, endpoint, region),
    },
  })
})

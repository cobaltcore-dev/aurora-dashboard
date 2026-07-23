import { TRPCError } from "@trpc/server"
import { protectedProcedure, projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { AuroraPortalContext } from "../context"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_CEPH_CREDENTIALS = "NO_CEPH_CREDENTIALS" as const
export const CEPH_ACCESS_DENIED = "CEPH_ACCESS_DENIED" as const
export const CEPH_SERVICE_NOT_AVAILABLE = "CEPH_SERVICE_NOT_AVAILABLE" as const

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

  if (!ctx.cephRegion) {
    throw new Error("Ceph region not configured")
  }

  const region = ctx.cephRegion

  return { endpoint: baseEndpoint, region }
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

/**
 * Ceph procedure for octet-stream uploads.
 *
 * `octetInputParser` cannot be chained onto `cephProtectedProcedure`: that
 * procedure is built on `projectScopedProcedure`, which bundles a `project_id`
 * object input parser, and tRPC can't merge an object input with a raw-stream
 * input ("All input parsers did not resolve to an object"). So this builds on
 * the base `protectedProcedure` and rescopes manually from the
 * `x-upload-project-id` header — mirroring `swiftRouter.uploadObject` — while
 * exposing the same `getCephClient` factory as `cephProtectedProcedure`.
 *
 * The project id must arrive as a header rather than a tRPC input because the
 * request body is the file stream. Credentials and S3 config are resolved
 * against the rescoped session, so the S3 client targets the right project.
 */
export const cephUploadProcedure = protectedProcedure.use(async function resolveCephForUpload(opts) {
  const { ctx, next } = opts

  const uploadProjectId = (ctx.req.headers["x-upload-project-id"] as string | undefined)?.trim()
  if (!uploadProjectId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "x-upload-project-id header is required for uploads",
    })
  }

  // Rescope the OpenStack session to the target project (projectScopedProcedure
  // normally does this from the project_id input, which octet uploads lack).
  const openstackSession = await ctx.rescopeSession({ projectId: uploadProjectId })
  if (!openstackSession) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Failed to scope session to project. User may not have access to this project.",
    })
  }

  // Resolve EC2 credentials and S3 endpoint/region against the rescoped session
  // so the S3 client is built for the upload's project, not the request default.
  const scopedCtx = { ...ctx, openstack: openstackSession }
  const credentials = await resolveEC2Credential(scopedCtx)
  if (!credentials) {
    throw new TRPCError({ code: "FORBIDDEN", message: NO_CEPH_CREDENTIALS })
  }
  const { endpoint, region } = resolveS3Config(scopedCtx)

  // Spread scopedCtx (not ctx) so downstream resolvers see the *rescoped*
  // openstack session — otherwise ctx.openstack would still be the pre-rescope
  // session, making auth/scoping inconsistent with the S3 client we just built
  // and preventing anything downstream from reading the upload's project id off
  // the token.
  return next({
    ctx: {
      ...scopedCtx,
      cephCredentials: credentials,
      cephRegion: region,
      getCephClient: (): S3Client => createS3Client(credentials.access, credentials.secret, endpoint, region),
    },
  })
})

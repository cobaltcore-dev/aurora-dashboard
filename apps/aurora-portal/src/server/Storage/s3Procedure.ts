import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../trpc"
import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import type { S3Client } from "@aws-sdk/client-s3"
import { createS3Client } from "./clients/s3Client"

export const NO_S3_CREDENTIALS = "NO_S3_CREDENTIALS" as const

/**
 * Extends projectScopedProcedure with EC2 credential resolution.
 * Before every S3 procedure:
 *   - checks if EC2 credentials exist for the current user + project
 *   - if none exist → throws FORBIDDEN with message NO_S3_CREDENTIALS
 *     (frontend catches this globally to show the credential creation prompt)
 *   - if found → adds getS3Client() to ctx
 */
export const s3ProtectedProcedure = projectScopedProcedure.use(
  async function resolveS3Credentials(opts) {
    const { ctx, next } = opts

    const credentials = await resolveEC2Credential(ctx)

    if (!credentials) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NO_S3_CREDENTIALS,
      })
    }

    const { access, secret } = credentials

    return next({
      ctx: {
        ...ctx,
        getS3Client: (): S3Client => createS3Client(access, secret),
      },
    })
  }
)

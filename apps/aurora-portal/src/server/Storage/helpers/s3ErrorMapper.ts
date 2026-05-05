import { TRPCError } from "@trpc/server"

interface S3ErrorShape {
  name?: string
  Code?: string
  message?: string
}

const S3_ERROR_MAP: Record<string, TRPCError["code"]> = {
  NoSuchBucket: "NOT_FOUND",
  NoSuchKey: "NOT_FOUND",
  NoSuchUpload: "NOT_FOUND",
  BucketAlreadyExists: "CONFLICT",
  BucketAlreadyOwnedByYou: "CONFLICT",
  BucketNotEmpty: "PRECONDITION_FAILED",
  AccessDenied: "FORBIDDEN",
  AllAccessDisabled: "FORBIDDEN",
  InvalidAccessKeyId: "UNAUTHORIZED",
  SignatureDoesNotMatch: "UNAUTHORIZED",
  TokenRefreshRequired: "UNAUTHORIZED",
  RequestTimeTooSkewed: "UNAUTHORIZED",
  InvalidBucketName: "BAD_REQUEST",
  KeyTooLongError: "BAD_REQUEST",
  EntityTooLarge: "PAYLOAD_TOO_LARGE",
  EntityTooSmall: "BAD_REQUEST",
}

/**
 * Maps AWS SDK S3 errors to TRPCError instances with contextual messages.
 */
export function mapS3ErrorToTRPCError(
  error: unknown,
  context: { operation: string; bucket?: string; key?: string }
): never {
  if (error instanceof TRPCError) {
    throw error
  }

  const s3Error = error as S3ErrorShape
  const errorCode = s3Error.Code ?? s3Error.name ?? ""
  const trpcCode = S3_ERROR_MAP[errorCode] ?? "INTERNAL_SERVER_ERROR"

  const parts = [`Failed to ${context.operation}`]
  if (context.bucket) parts.push(`bucket: ${context.bucket}`)
  if (context.key) parts.push(`key: ${context.key}`)
  if (s3Error.message && trpcCode === "INTERNAL_SERVER_ERROR") {
    parts.push(s3Error.message)
  }

  throw new TRPCError({
    code: trpcCode,
    message: parts.join(" — "),
    cause: error instanceof Error ? error : undefined,
  })
}

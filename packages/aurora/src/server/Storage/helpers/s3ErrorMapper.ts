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
  NoSuchVersion: "NOT_FOUND",
  BucketAlreadyExists: "CONFLICT",
  BucketAlreadyOwnedByYou: "CONFLICT",
  BucketNotEmpty: "PRECONDITION_FAILED",
  InvalidBucketState: "BAD_REQUEST",
  VersioningNotEnabled: "PRECONDITION_FAILED",
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
 *
 * Special handling for AccessDenied vs InvalidAccessKeyId:
 * - AccessDenied: Valid credentials but insufficient permissions (403)
 * - InvalidAccessKeyId: Invalid/expired credentials (401)
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

  // Log unmapped errors for future improvements
  if (!S3_ERROR_MAP[errorCode] && errorCode) {
    console.warn(`[s3] Unmapped S3 error code: ${errorCode}`)
  }

  // Build contextual error message
  const parts = [`Failed to ${context.operation}`]
  if (context.bucket) parts.push(`bucket: ${context.bucket}`)
  if (context.key) parts.push(`key: ${context.key}`)

  // Add specific error details for access-related errors
  if (errorCode === "AccessDenied") {
    parts.push("Access denied — your credentials are valid but lack permissions for this operation")
  } else if (
    errorCode === "InvalidAccessKeyId" ||
    errorCode === "SignatureDoesNotMatch" ||
    errorCode === "TokenRefreshRequired" ||
    errorCode === "RequestTimeTooSkewed"
  ) {
    parts.push("Invalid access key — your credentials may be expired or incorrect")
  } else if (s3Error.message) {
    parts.push(s3Error.message)
  }

  throw new TRPCError({
    code: trpcCode,
    message: parts.join(" — "),
    cause: error instanceof Error ? error : undefined,
  })
}

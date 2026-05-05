import { TRPCClientError } from "@trpc/client"

export const NO_S3_CREDENTIALS = "NO_S3_CREDENTIALS" as const

export function isNoS3CredentialsError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false
  return error.data?.code === "FORBIDDEN" && error.message === NO_S3_CREDENTIALS
}

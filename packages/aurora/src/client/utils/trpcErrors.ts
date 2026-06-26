/**
 * Type guard to check if an error is a tRPC error with UNAUTHORIZED code
 */
export function isTRPCUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "UNAUTHORIZED"
}

/**
 * Type guard to check if an error is a tRPC error
 */
export function isTRPCError(error: unknown): error is { data: { code: string }; message?: string } {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return typeof e.data === "object" && e.data !== null && typeof e.data.code === "string"
}

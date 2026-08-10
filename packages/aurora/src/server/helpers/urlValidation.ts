import { TRPCError } from "@trpc/server"

/**
 * Validates that a URL is relative and not absolute.
 * Rejects absolute URLs (http:, https:) and scheme-relative URLs (//) to prevent SSRF attacks.
 *
 * @param url - The URL string to validate
 * @returns true if the URL is absolute (and should be rejected), false if relative (safe)
 */
export function isAbsoluteUrl(url: string): boolean {
  const trimmed = url.trim()
  return /^(?:https?:|\/\/)/i.test(trimmed)
}

/**
 * Validates that a pagination URL is relative and throws a TRPCError if it's absolute.
 * Use this to prevent SSRF attacks when accepting pagination URLs from clients.
 *
 * @param url - The URL string to validate
 * @param paramName - The name of the parameter being validated (for error messages)
 * @throws {TRPCError} with BAD_REQUEST code if the URL is absolute
 */
export function validateRelativeUrl(url: string | undefined, paramName: string): void {
  if (url && isAbsoluteUrl(url)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${paramName}: absolute URLs are not allowed for security reasons`,
    })
  }
}

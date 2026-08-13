/**
 * Sensitive header names that must never reach browser code.
 * These contain cryptographic secrets used for authentication and authorization.
 */
const REDACTED_HEADERS = [
  "x-auth-token",
  "x-subject-token",
  "x-container-sync-key",
  "x-container-meta-temp-url-key",
  "x-container-meta-temp-url-key-2",
  "x-account-meta-temp-url-key",
  "x-account-meta-temp-url-key-2",
  "authorization",
] as const

/**
 * Check if header contains secret material.
 */
export function isSecretHeader(headerName: string): boolean {
  return REDACTED_HEADERS.includes(headerName.toLowerCase() as (typeof REDACTED_HEADERS)[number])
}

/**
 * Redact secret headers from Swift account metadata response.
 * Returns presence flags instead of secret values.
 *
 * @param headers - Response headers from Swift API
 * @returns Object with boolean flag indicating presence of TempURL keys
 */
export function redactAccountSecrets(headers: Headers): {
  hasTempUrlKey: boolean
} {
  return {
    hasTempUrlKey: headers.has("x-account-meta-temp-url-key") || headers.has("x-account-meta-temp-url-key-2"),
  }
}

/**
 * Redact secret headers from Swift container metadata response.
 * Returns presence flags instead of secret values.
 *
 * @param headers - Response headers from Swift API
 * @returns Object with boolean flags indicating presence of secrets
 */
export function redactContainerSecrets(headers: Headers): {
  hasTempUrlKey: boolean
  hasSyncKey: boolean
} {
  return {
    hasTempUrlKey: headers.has("x-container-meta-temp-url-key") || headers.has("x-container-meta-temp-url-key-2"),
    hasSyncKey: headers.has("x-container-sync-key"),
  }
}

import { SignalOpenstackError } from "./error"

/**
 * Encode a single OpenStack path segment.
 * Rejects path traversal characters and encodes for URL safety.
 *
 * @param segment - Path segment (e.g., flavor ID, container name)
 * @param label - Label for error messages
 * @throws {SignalOpenstackError} If segment contains path syntax
 *
 * @example
 * encodeOpenstackPathSegment("flavor-123") // "flavor-123"
 * encodeOpenstackPathSegment("my container") // "my%20container"
 * encodeOpenstackPathSegment("../admin") // throws SignalOpenstackError
 */
export function encodeOpenstackPathSegment(segment: string, label = "Path segment"): string {
  if (!segment || typeof segment !== "string") {
    throw new SignalOpenstackError(`${label} must be a non-empty string`)
  }

  // Reject path traversal attempts
  if (segment.includes("..") || segment.includes("./")) {
    throw new SignalOpenstackError(`${label} contains path traversal characters`)
  }

  // Reject explicit path separators
  if (segment.includes("/")) {
    throw new SignalOpenstackError(`${label} must not contain slashes`)
  }

  // Reject URL special characters that could break path parsing
  if (segment.match(/[?#]/)) {
    throw new SignalOpenstackError(`${label} contains URL special characters`)
  }

  return encodeURIComponent(segment)
}

/**
 * Encode multiple path segments and join with slashes.
 *
 * @example
 * encodeOpenstackPath("flavors", flavorId, "os-extra_specs")
 * // "flavors/abc-123/os-extra_specs"
 */
export function encodeOpenstackPath(...segments: string[]): string {
  return segments.map((seg, idx) => encodeOpenstackPathSegment(seg, `Path segment ${idx}`)).join("/")
}

/**
 * Validate and encode an OpenStack resource ID.
 * Validates against path traversal/path-syntax and URL-encodes the segment; does NOT require UUID.
 *
 * Use this for resource IDs that may be custom strings (e.g., flavor IDs like "m1.small").
 */
export function validateAndEncodeResourceId(id: string, resourceType = "Resource"): string {
  return encodeOpenstackPathSegment(id, `${resourceType} ID`)
}

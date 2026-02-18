/**
 * Reusable helpers for building URL query strings from plain objects.
 * Use from any BFF router (Neutron, Glance, Swift, etc.) to avoid repetitive if/append blocks.
 */

export interface AppendQueryParamsOptions {
  /**
   * Map source object keys to query param names (e.g. tags_any -> "tags-any" for Neutron).
   * Keys not in keyMap are used as-is.
   */
  keyMap?: Record<string, string>
}

/**
 * Appends non-undefined properties of `source` to `queryParams`.
 * - undefined: skipped
 * - null: skipped
 * - boolean: "true" | "false"
 * - number: stringified
 * - string: used as-is (empty string is appended)
 * - other: skipped
 *
 * @param source - Object whose enumerable properties to append (e.g. validated tRPC input)
 * @param options - Optional key mapping for query param names
 */
export function appendQueryParamsFromObject(
  source: Record<string, unknown>,
  options?: AppendQueryParamsOptions
): URLSearchParams {
  const queryParams = new URLSearchParams()
  const { keyMap } = options ?? {}

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue

    const paramName = keyMap?.[key] ?? key

    if (typeof value === "boolean") {
      queryParams.append(paramName, value ? "true" : "false")
    } else if (typeof value === "number" || typeof value === "string") {
      queryParams.append(paramName, String(value))
    }
  }
  return queryParams
}

/**
 * Swift timestamp helpers.
 *
 * Swift returns `last_modified` in container and object listings as an ISO 8601
 * timestamp that is UTC but carries NO zone designator — e.g.
 * "2024-03-01T08:00:00.000000" (see OpenStack Swift bug #1169287: dates in the
 * JSON listings are UTC without a trailing "Z"). Per ISO 8601, a date-time with
 * no zone is interpreted as LOCAL time, so `new Date("...T08:00:00")` treats the
 * value as local and the rendered time ends up shifted by the viewer's UTC
 * offset (#1236).
 *
 * These helpers treat a zone-less timestamp as UTC (by appending "Z" before
 * parsing) so it converts correctly to the viewer's local time. Timestamps that
 * already carry a zone — a trailing "Z" or an explicit ±hh:mm offset, as Ceph
 * returns — are left untouched.
 */

// Matches a zone designator at the end of the string: "Z", or an offset like
// "+02:00" / "-0500". The date part's own hyphens can't match because of the `$`
// anchor.
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/

/**
 * Parse a Swift timestamp into a Date, treating a zone-less value as UTC.
 * Returns null for empty or unparseable input.
 */
export const parseSwiftDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Only a full date-time (has a "T") that lacks a zone needs normalizing to
  // UTC. A date-only string ("2024-03-01") is already parsed as UTC by the
  // engine, and appending "Z" to it would make it invalid.
  const needsUtc = trimmed.includes("T") && !HAS_ZONE.test(trimmed)
  const normalized = needsUtc ? `${trimmed}Z` : trimmed

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Format a Swift timestamp in the viewer's local timezone.
 *
 * Returns null for empty/invalid input so callers can supply their own fallback
 * (e.g. a translated "N/A"). `locales`/`options` are passed straight through to
 * `Date.prototype.toLocaleString`.
 */
export const formatSwiftDate = (
  value: string | null | undefined,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string | null => {
  const date = parseSwiftDate(value)
  return date ? date.toLocaleString(locales, options) : null
}

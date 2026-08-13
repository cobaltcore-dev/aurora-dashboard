import type { LifecycleRule, LifecycleRuleRead, LifecycleFilter, LifecycleTag } from "../types/ceph"

/**
 * Normalizes a date to midnight UTC.
 * AWS S3 requires Expiration.Date to be at midnight UTC.
 *
 * @param date - Input date (can be any time of day)
 * @returns Date object set to midnight UTC of the same calendar day
 */
function toMidnightUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Normalizes filter structure for consistency and S3 API compliance.
 *
 * Rules:
 * - No filter conditions → { Prefix: "" } (whole-bucket filter)
 * - Single condition → top-level (Prefix, Tag, ObjectSize*)
 * - Multiple conditions → { And: { ... } }
 * - Empty prefix is normalized to no prefix (omitted)
 *
 * @param prefix - Optional prefix string
 * @param tags - Optional array of tags
 * @returns Normalized LifecycleFilter or undefined
 */
export function normalizeFilter(prefix?: string, tags?: LifecycleTag[]): LifecycleFilter | undefined {
  const hasPrefix = prefix !== undefined && prefix !== ""
  const hasTags = tags !== undefined && tags.length > 0

  // No conditions at all → whole-bucket rule (empty prefix)
  if (!hasPrefix && !hasTags) {
    return { Prefix: "" }
  }

  // Single tag, no prefix → { Tag }
  if (!hasPrefix && hasTags && tags.length === 1) {
    return { Tag: tags[0] }
  }

  // Only prefix → { Prefix }
  if (hasPrefix && !hasTags) {
    return { Prefix: prefix }
  }

  // Multiple conditions (prefix + tags, or 2+ tags) → { And }
  if ((hasPrefix && hasTags) || (hasTags && tags.length > 1)) {
    return {
      And: {
        Prefix: hasPrefix ? prefix : undefined,
        Tags: hasTags ? tags : undefined,
      },
    }
  }

  // Fallback (shouldn't reach here)
  return { Prefix: "" }
}

/**
 * Converts SDK lifecycle rules (wire format, ISO strings) to internal format (Date objects).
 *
 * - Parses ISO 8601 date strings to Date objects
 * - Normalizes Expiration.Date to midnight UTC (AWS requirement)
 * - Preserves Transitions[].Date as-is (not normalized)
 * - Preserves all other fields unchanged
 *
 * @param wireRules - Rules from S3 SDK (read from S3)
 * @returns Rules with Date objects instead of strings
 */
export function toSdkLifecycleRules(wireRules: LifecycleRuleRead[]): LifecycleRule[] {
  return wireRules.map((rule) => {
    // Build a LifecycleRule (strict schema) from LifecycleRuleRead (lenient schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      Status: rule.Status as "Enabled" | "Disabled",
      ID: rule.ID,
      Prefix: rule.Prefix,
      Filter: rule.Filter as LifecycleFilter | undefined,
    }

    if (rule.Expiration) {
      result.Expiration = {
        Days: rule.Expiration.Days,
        ExpiredObjectDeleteMarker: rule.Expiration.ExpiredObjectDeleteMarker,
        // Only normalize Expiration.Date to midnight UTC (AWS requirement)
        Date:
          rule.Expiration.Date !== undefined
            ? typeof rule.Expiration.Date === "string"
              ? toMidnightUTC(new Date(rule.Expiration.Date))
              : toMidnightUTC(rule.Expiration.Date)
            : undefined,
      }
    }

    // Transitions preserved as-is (no midnight normalization)
    if (rule.Transitions) {
      result.Transitions = rule.Transitions.map((t) => ({
        Days: t.Days,
        StorageClass: t.StorageClass,
        Date: t.Date !== undefined ? (typeof t.Date === "string" ? new Date(t.Date) : t.Date) : undefined,
      }))
    }

    if (rule.NoncurrentVersionExpiration) {
      result.NoncurrentVersionExpiration = {
        NoncurrentDays: rule.NoncurrentVersionExpiration.NoncurrentDays,
        NewerNoncurrentVersions: rule.NoncurrentVersionExpiration.NewerNoncurrentVersions,
      }
    }

    if (rule.NoncurrentVersionTransitions) {
      result.NoncurrentVersionTransitions = rule.NoncurrentVersionTransitions.map((t) => ({
        NoncurrentDays: t.NoncurrentDays,
        StorageClass: t.StorageClass,
        NewerNoncurrentVersions: t.NewerNoncurrentVersions,
      }))
    }

    if (rule.AbortIncompleteMultipartUpload) {
      result.AbortIncompleteMultipartUpload = {
        DaysAfterInitiation: rule.AbortIncompleteMultipartUpload.DaysAfterInitiation,
      }
    }

    return result as LifecycleRule
  })
}

/**
 * Converts internal lifecycle rules (Date objects) to wire format (ISO strings).
 *
 * - Converts Date objects to ISO 8601 strings
 * - Preserves all fields unchanged
 * - Used before sending rules to S3 SDK
 *
 * @param sdkRules - Rules with Date objects
 * @returns Rules with ISO 8601 date strings
 */
export function toWireLifecycleRules(sdkRules: LifecycleRule[]): LifecycleRuleRead[] {
  return sdkRules.map((rule) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      Status: rule.Status,
      ID: rule.ID,
      Prefix: rule.Prefix,
      Filter: rule.Filter,
    }

    if (rule.Expiration) {
      const expirationDate = rule.Expiration.Date
      result.Expiration = {
        Days: rule.Expiration.Days,
        ExpiredObjectDeleteMarker: rule.Expiration.ExpiredObjectDeleteMarker,
        Date:
          expirationDate !== undefined
            ? typeof expirationDate === "string"
              ? expirationDate
              : (expirationDate as Date).toISOString()
            : undefined,
      }
    }

    if (rule.Transitions) {
      result.Transitions = rule.Transitions.map((t) => {
        const transitionDate = t.Date
        return {
          Days: t.Days,
          StorageClass: t.StorageClass,
          Date:
            transitionDate !== undefined
              ? typeof transitionDate === "string"
                ? transitionDate
                : (transitionDate as Date).toISOString()
              : undefined,
        }
      })
    }

    if (rule.NoncurrentVersionExpiration) {
      result.NoncurrentVersionExpiration = rule.NoncurrentVersionExpiration
    }

    if (rule.NoncurrentVersionTransitions) {
      result.NoncurrentVersionTransitions = rule.NoncurrentVersionTransitions
    }

    if (rule.AbortIncompleteMultipartUpload) {
      result.AbortIncompleteMultipartUpload = rule.AbortIncompleteMultipartUpload
    }

    return result as LifecycleRuleRead
  })
}

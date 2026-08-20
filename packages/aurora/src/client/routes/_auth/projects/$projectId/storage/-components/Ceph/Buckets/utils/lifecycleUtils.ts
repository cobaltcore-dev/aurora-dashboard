import type {
  LifecycleRuleRead,
  LifecycleRule,
  LifecycleFilter,
  LifecycleTag,
  LifecycleExpiration,
  LifecycleTransition,
  LifecycleNoncurrentVersionExpiration,
  LifecycleNoncurrentVersionTransition,
} from "@/server/Storage/types/ceph"

/**
 * Normalizes filter structure for consistency and S3 API compliance.
 *
 * Intentional duplicate of `lifecycleMapper.normalizeFilter` — importing the server module
 * into the client bundle is the failure mode documented in the CORS postmortem. Keep
 * behaviourally identical; `lifecycleUtils.test.ts` mirrors `lifecycleMapper.test.ts`'s filter cases.
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

export type DaysParseResult = { ok: true; value: number } | { ok: false; reason: "empty" | "invalid" }

/**
 * Parses a Days input string into a validated positive integer.
 *
 * Mirrors the server's `z.number().int().min(1)` constraint used for lifecycle rule Days fields
 * (Expiration.Days, NoncurrentVersionExpiration.NoncurrentDays, AbortIncompleteMultipartUpload.DaysAfterInitiation).
 *  *
 * @param raw - Raw string value from a Days input field
 * @returns `{ ok: true, value }` for a valid positive integer, or `{ ok: false, reason }` otherwise
 *  */

export function parseDaysValue(raw: string): DaysParseResult {
  const trimmed = raw.trim()
  if (trimmed === "") return { ok: false, reason: "empty" }
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "invalid" }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value < 1) return { ok: false, reason: "invalid" }
  return { ok: true, value }
}

/**
 * Convert LifecycleRuleRead (lenient read schema) to LifecycleRule (strict write schema)
 *
 * Performs real conversion, not just a cast:
 * - Narrows Status from string to "Enabled" | "Disabled"
 * - Converts Date objects to ISO strings for Expiration.Date and Transitions[].Date
 * - Preserves all other fields unchanged
 *
 * @param rule - Rule from server (read schema)
 * @returns Rule suitable for mutation (write schema)
 */
export function toLifecycleRule(rule: LifecycleRuleRead): LifecycleRule {
  const converted: Partial<LifecycleRule> = {
    ID: rule.ID,
    Status: rule.Status as "Enabled" | "Disabled",
    Prefix: rule.Prefix,
    Filter: rule.Filter as LifecycleRule["Filter"],
    NoncurrentVersionExpiration: rule.NoncurrentVersionExpiration as LifecycleRule["NoncurrentVersionExpiration"],
    NoncurrentVersionTransitions: rule.NoncurrentVersionTransitions as LifecycleRule["NoncurrentVersionTransitions"],
    AbortIncompleteMultipartUpload:
      rule.AbortIncompleteMultipartUpload as LifecycleRule["AbortIncompleteMultipartUpload"],
  }

  // Convert Expiration.Date if it's a Date object
  if (rule.Expiration?.Date) {
    const date = rule.Expiration.Date
    converted.Expiration = {
      ...rule.Expiration,
      Date: typeof date === "string" ? date : date.toISOString(),
    } as LifecycleRule["Expiration"]
  } else if (rule.Expiration) {
    converted.Expiration = rule.Expiration as LifecycleRule["Expiration"]
  }

  // Convert Transitions[].Date if any are Date objects
  if (rule.Transitions && rule.Transitions.length > 0) {
    converted.Transitions = rule.Transitions.map((t) => {
      if (t.Date) {
        const date = t.Date
        return {
          ...t,
          Date: typeof date === "string" ? date : date.toISOString(),
        }
      }
      return t
    }) as LifecycleRule["Transitions"]
  }

  return converted as LifecycleRule
}

/**
 * Validate lifecycle rules against the write schema's structural requirements
 *
 * Mirrors lifecycleRuleSchema's refinements, plus additional checks:
 * - Must have at least one action
 * - Cannot have both Filter and legacy Prefix
 * - ExpiredObjectDeleteMarker incompatible with tag filters
 * - ExpiredObjectDeleteMarker cannot be combined with Days or Date
 * - AbortIncompleteMultipartUpload incompatible with tag filters
 * - And filter must have ≥2 predicates (per-tag counting)
 * - Top-level filter conditions must be wrapped in And
 * - ID ≤ 255 characters
 * - NoncurrentVersionExpiration must have NoncurrentDays
 * - Transitions must have either Days or Date (XOR)
 * - 1-100 rules with unique non-empty IDs
 *
 * @param rules - Rules to validate
 * @returns Success with converted rules, or failure with error messages
 */
export function validateLifecycleRules(
  rules: LifecycleRuleRead[]
): { ok: true; rules: LifecycleRule[] } | { ok: false; errors: string[] } {
  const errors: string[] = []

  // Check rule count
  if (rules.length === 0) {
    errors.push("Lifecycle configuration must have at least one rule")
    return { ok: false, errors }
  }
  if (rules.length > 100) {
    errors.push(`Lifecycle configuration can have at most 100 rules (found ${rules.length})`)
    return { ok: false, errors }
  }

  const seenIds = new Set<string>()

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    const ruleLabel = rule.ID ? `Rule "${rule.ID}"` : `Rule #${i + 1}`

    // Check ID length
    if (rule.ID && rule.ID.length > 255) {
      errors.push(`${ruleLabel}: ID must be at most 255 characters`)
    }

    // Check for duplicate IDs
    if (rule.ID) {
      if (seenIds.has(rule.ID)) {
        errors.push(`${ruleLabel}: Duplicate rule ID`)
      }
      seenIds.add(rule.ID)
    }

    // Check Status is valid
    if (rule.Status !== "Enabled" && rule.Status !== "Disabled") {
      errors.push(`${ruleLabel}: Status must be "Enabled" or "Disabled" (found "${rule.Status}")`)
    }

    // Must have at least one action
    const hasExpiration = rule.Expiration !== undefined
    const hasTransitions = rule.Transitions !== undefined && rule.Transitions.length > 0
    const hasNoncurrentExpiration = rule.NoncurrentVersionExpiration !== undefined
    const hasNoncurrentTransitions =
      rule.NoncurrentVersionTransitions !== undefined && rule.NoncurrentVersionTransitions.length > 0
    const hasAbortUpload = rule.AbortIncompleteMultipartUpload !== undefined

    if (!hasExpiration && !hasTransitions && !hasNoncurrentExpiration && !hasNoncurrentTransitions && !hasAbortUpload) {
      errors.push(`${ruleLabel}: Must have at least one action`)
    }

    // Cannot have both Filter and legacy Prefix
    if (rule.Filter !== undefined && rule.Prefix !== undefined) {
      errors.push(`${ruleLabel}: Cannot have both Filter and legacy Prefix field set`)
    }

    // ExpiredObjectDeleteMarker cannot be combined with tag-based filters
    if (rule.Expiration?.ExpiredObjectDeleteMarker === true) {
      const hasTagFilter =
        rule.Filter?.Tag !== undefined || (rule.Filter?.And?.Tags !== undefined && rule.Filter.And.Tags.length > 0)
      if (hasTagFilter) {
        errors.push(`${ruleLabel}: ExpiredObjectDeleteMarker cannot be combined with tag-based filters`)
      }
    }

    // AbortIncompleteMultipartUpload cannot be combined with tag-based filters  mirrors lifecycleRuleSchema (server)
    if (rule.AbortIncompleteMultipartUpload !== undefined) {
      const hasTagFilter =
        rule.Filter?.Tag !== undefined || (rule.Filter?.And?.Tags !== undefined && rule.Filter.And.Tags.length > 0)
      if (hasTagFilter) {
        errors.push(`${ruleLabel}: AbortIncompleteMultipartUpload cannot be combined with tag-based filters`)
      }
    }

    // ExpiredObjectDeleteMarker is a distinct action — mirrors lifecycleExpirationSchema (server)
    if (
      rule.Expiration?.ExpiredObjectDeleteMarker === true &&
      (rule.Expiration.Days !== undefined || rule.Expiration.Date !== undefined)
    ) {
      errors.push(`${ruleLabel}: ExpiredObjectDeleteMarker cannot be combined with Days or Date`)
    }

    // And filter must have ≥2 predicates — per-tag counting, mirrors lifecycleFilterAndSchema (server)
    if (rule.Filter?.And) {
      const predicateCount =
        (rule.Filter.And.Prefix !== undefined && rule.Filter.And.Prefix !== "" ? 1 : 0) +
        (rule.Filter.And.Tags?.length ?? 0) +
        (rule.Filter.And.ObjectSizeGreaterThan !== undefined ? 1 : 0) +
        (rule.Filter.And.ObjectSizeLessThan !== undefined ? 1 : 0)
      if (predicateCount < 2) {
        errors.push(`${ruleLabel}: And filter must contain at least 2 predicates`)
      }
    }

    // Top-level conditions must not combine with each other or with And — mirrors lifecycleFilterSchema (server)
    if (rule.Filter) {
      const topLevelConditions = [
        rule.Filter.Prefix !== undefined,
        rule.Filter.Tag !== undefined,
        rule.Filter.ObjectSizeGreaterThan !== undefined,
        rule.Filter.ObjectSizeLessThan !== undefined,
      ].filter(Boolean).length
      if (topLevelConditions > 1 || (rule.Filter.And && topLevelConditions > 0)) {
        errors.push(
          `${ruleLabel}: Multiple filter conditions (Prefix, Tag, ObjectSize) must be wrapped in an And clause`
        )
      }
    }

    // NoncurrentVersionExpiration must have NoncurrentDays
    if (rule.NoncurrentVersionExpiration) {
      if (rule.NoncurrentVersionExpiration.NoncurrentDays === undefined) {
        errors.push(`${ruleLabel}: NoncurrentVersionExpiration must have NoncurrentDays`)
      }
    }

    // Transitions must have Days XOR Date
    if (rule.Transitions) {
      for (let j = 0; j < rule.Transitions.length; j++) {
        const transition = rule.Transitions[j]
        const hasDays = transition.Days !== undefined
        const hasDate = transition.Date !== undefined
        if (!hasDays && !hasDate) {
          errors.push(`${ruleLabel}: Transition #${j + 1} must have either Days or Date`)
        }
        if (hasDays && hasDate) {
          errors.push(`${ruleLabel}: Transition #${j + 1} cannot have both Days and Date`)
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  // Convert all rules
  const convertedRules = rules.map((rule) => toLifecycleRule(rule))
  return { ok: true, rules: convertedRules }
}

/**
 * Format a lifecycle filter for display
 *
 * Handles legacy top-level Prefix field (item-23) and all Filter variants.
 *
 * @param filter - Filter object
 * @param legacyPrefix - Legacy top-level Prefix field
 * @returns Human-readable filter description
 */
export function formatFilter(filter: LifecycleFilter | undefined, legacyPrefix?: string): string {
  if (!filter) {
    // No Filter - check for legacy top-level Prefix
    if (legacyPrefix) {
      return `Prefix: ${legacyPrefix}`
    }
    return "All objects"
  }
  const parts: string[] = []

  if (filter.Prefix) parts.push(`Prefix: ${filter.Prefix}`)
  if (filter.Tag) parts.push(`Tag: ${filter.Tag.Key}=${filter.Tag.Value}`)
  if (filter.ObjectSizeGreaterThan !== undefined) parts.push(`Size > ${filter.ObjectSizeGreaterThan} bytes`)
  if (filter.ObjectSizeLessThan !== undefined) parts.push(`Size < ${filter.ObjectSizeLessThan} bytes`)

  if (filter.And) {
    const andParts: string[] = []
    if (filter.And.Prefix) andParts.push(`Prefix: ${filter.And.Prefix}`)
    if (filter.And.Tags) {
      filter.And.Tags.forEach((tag) => andParts.push(`Tag: ${tag.Key}=${tag.Value}`))
    }
    if (filter.And.ObjectSizeGreaterThan !== undefined)
      andParts.push(`Size > ${filter.And.ObjectSizeGreaterThan} bytes`)
    if (filter.And.ObjectSizeLessThan !== undefined) andParts.push(`Size < ${filter.And.ObjectSizeLessThan} bytes`)
    parts.push(andParts.join(" AND "))
  }

  return parts.length > 0 ? parts.join(", ") : "All objects"
}

/**
 * Format lifecycle expiration for display
 *
 * @param expiration - Expiration configuration
 * @returns Human-readable expiration description
 */
export function formatExpiration(expiration: LifecycleExpiration | undefined): string {
  if (!expiration) return "–"
  if (expiration.Days) return `After ${expiration.Days} days`
  if (expiration.Date) {
    const date = typeof expiration.Date === "string" ? new Date(expiration.Date) : expiration.Date
    return `On ${date.toLocaleDateString()}`
  }
  if (expiration.ExpiredObjectDeleteMarker) return "Clean up expired delete markers"
  return "–"
}

/**
 * Format lifecycle transitions for display
 *
 * @param transitions - Array of transitions
 * @returns Human-readable transitions description
 */
export function formatTransitions(transitions: LifecycleTransition[] | undefined): string {
  if (!transitions || transitions.length === 0) return "–"
  return transitions
    .map((t) => {
      const time = t.Days
        ? `${t.Days} days`
        : t.Date
          ? new Date(typeof t.Date === "string" ? t.Date : t.Date).toLocaleDateString()
          : "unknown"
      return `${t.StorageClass} after ${time}`
    })
    .join("; ")
}

/**
 * Format noncurrent version expiration for display
 *
 * @param noncurrentExp - Noncurrent version expiration configuration
 * @returns Human-readable description
 */
export function formatNoncurrentExpiration(noncurrentExp: LifecycleNoncurrentVersionExpiration | undefined): string {
  if (!noncurrentExp) return "–"
  const parts: string[] = []
  if (noncurrentExp.NoncurrentDays) {
    parts.push(`After ${noncurrentExp.NoncurrentDays} days`)
  }
  if (noncurrentExp.NewerNoncurrentVersions !== undefined) {
    parts.push(`(keep ${noncurrentExp.NewerNoncurrentVersions} versions)`)
  }
  return parts.length > 0 ? parts.join(" ") : "–"
}

/**
 * Format noncurrent version transitions for display
 *
 * @param transitions - Array of noncurrent version transitions
 * @returns Human-readable description
 */
export function formatNoncurrentTransitions(transitions: LifecycleNoncurrentVersionTransition[] | undefined): string {
  if (!transitions || transitions.length === 0) return "–"
  return transitions
    .map((t) => {
      const keep = t.NewerNoncurrentVersions !== undefined ? ` (keep ${t.NewerNoncurrentVersions})` : ""
      return `${t.StorageClass} after ${t.NoncurrentDays} days${keep}`
    })
    .join("; ")
}

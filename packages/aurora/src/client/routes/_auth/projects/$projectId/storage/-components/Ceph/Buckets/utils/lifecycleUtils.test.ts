import { describe, it, expect } from "vitest"
import {
  normalizeFilter,
  toLifecycleRule,
  validateLifecycleRules,
  isWholeBucketExpirationRule,
  formatFilter,
  formatExpiration,
  formatTransitions,
  formatNoncurrentExpiration,
  formatNoncurrentTransitions,
} from "./lifecycleUtils"
import type { LifecycleRuleRead, LifecycleTag } from "@/server/Storage/types/ceph"

describe("lifecycleUtils", () => {
  describe("normalizeFilter", () => {
    it("should return whole-bucket filter when no conditions", () => {
      expect(normalizeFilter()).toEqual({ Prefix: "" })
      expect(normalizeFilter("", [])).toEqual({ Prefix: "" })
    })

    it("should return Prefix only when only prefix provided", () => {
      expect(normalizeFilter("logs/")).toEqual({ Prefix: "logs/" })
    })

    it("should return Tag only when single tag and no prefix", () => {
      const tags: LifecycleTag[] = [{ Key: "env", Value: "prod" }]
      expect(normalizeFilter(undefined, tags)).toEqual({ Tag: { Key: "env", Value: "prod" } })
    })

    it("should return And when prefix and tags provided", () => {
      const tags: LifecycleTag[] = [{ Key: "env", Value: "prod" }]
      expect(normalizeFilter("logs/", tags)).toEqual({
        And: {
          Prefix: "logs/",
          Tags: tags,
        },
      })
    })

    it("should return And when multiple tags provided", () => {
      const tags: LifecycleTag[] = [
        { Key: "env", Value: "prod" },
        { Key: "team", Value: "backend" },
      ]
      expect(normalizeFilter(undefined, tags)).toEqual({
        And: {
          Prefix: undefined,
          Tags: tags,
        },
      })
    })
  })

  describe("toLifecycleRule", () => {
    it("should narrow Status string to enum", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Expiration: { Days: 30 },
      }
      const result = toLifecycleRule(rule)
      expect(result.Status).toBe("Enabled")
    })

    it("should convert Expiration.Date from Date object to ISO string", () => {
      const dateObj = new Date("2026-12-31T00:00:00.000Z")
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Expiration: { Date: dateObj },
      }
      const result = toLifecycleRule(rule)
      expect(result.Expiration?.Date).toBe("2026-12-31T00:00:00.000Z")
    })

    it("should leave Expiration.Date as-is if already a string", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Expiration: { Date: "2026-12-31T00:00:00.000Z" },
      }
      const result = toLifecycleRule(rule)
      expect(result.Expiration?.Date).toBe("2026-12-31T00:00:00.000Z")
    })

    it("should convert Transitions[].Date from Date object to ISO string", () => {
      const dateObj = new Date("2026-12-31T00:00:00.000Z")
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Transitions: [{ Date: dateObj, StorageClass: "GLACIER" }],
      }
      const result = toLifecycleRule(rule)
      expect(result.Transitions?.[0].Date).toBe("2026-12-31T00:00:00.000Z")
    })

    it("should preserve other fields unchanged", () => {
      const rule: LifecycleRuleRead = {
        ID: "complex-rule",
        Status: "Disabled",
        Filter: { Prefix: "logs/" },
        Expiration: { Days: 90 },
        NoncurrentVersionExpiration: { NoncurrentDays: 30 },
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
      }
      const result = toLifecycleRule(rule)
      expect(result.ID).toBe("complex-rule")
      expect(result.Filter).toEqual({ Prefix: "logs/" })
      expect(result.NoncurrentVersionExpiration).toEqual({ NoncurrentDays: 30 })
      expect(result.AbortIncompleteMultipartUpload).toEqual({ DaysAfterInitiation: 7 })
    })
  })

  describe("validateLifecycleRules", () => {
    it("should reject empty rules array", () => {
      const result = validateLifecycleRules([])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain("Lifecycle configuration must have at least one rule")
      }
    })

    it("should reject more than 100 rules", () => {
      const rules = Array.from({ length: 101 }, (_, i) => ({
        ID: `rule-${i}`,
        Status: "Enabled",
        Expiration: { Days: 30 },
      })) as LifecycleRuleRead[]
      const result = validateLifecycleRules(rules)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("at most 100 rules"))).toBe(true)
      }
    })

    it("should reject ID longer than 255 characters", () => {
      const rule: LifecycleRuleRead = {
        ID: "a".repeat(256),
        Status: "Enabled",
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("at most 255 characters"))).toBe(true)
      }
    })

    it("should reject duplicate IDs", () => {
      const rules: LifecycleRuleRead[] = [
        { ID: "same-id", Status: "Enabled", Expiration: { Days: 30 } },
        { ID: "same-id", Status: "Enabled", Expiration: { Days: 60 } },
      ]
      const result = validateLifecycleRules(rules)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("Duplicate rule ID"))).toBe(true)
      }
    })

    it("should reject invalid Status", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Active" as unknown as "Enabled" | "Disabled",
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('Status must be "Enabled" or "Disabled"'))).toBe(true)
      }
    })

    it("should reject rule with no actions", () => {
      const rule: LifecycleRuleRead = {
        ID: "no-action",
        Status: "Enabled",
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("Must have at least one action"))).toBe(true)
      }
    })

    it("should reject both Filter and legacy Prefix", () => {
      const rule: LifecycleRuleRead = {
        ID: "conflict",
        Status: "Enabled",
        Prefix: "logs/",
        Filter: { Prefix: "data/" },
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("Cannot have both Filter and legacy Prefix"))).toBe(true)
      }
    })

    it("should reject ExpiredObjectDeleteMarker with tag filter", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { Tag: { Key: "env", Value: "prod" } },
        Expiration: { ExpiredObjectDeleteMarker: true },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(
          result.errors.some((e) => e.includes("ExpiredObjectDeleteMarker cannot be combined with tag-based filters"))
        ).toBe(true)
      }
    })

    it("should reject NoncurrentVersionExpiration without NoncurrentDays", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        NoncurrentVersionExpiration: {} as LifecycleRuleRead["NoncurrentVersionExpiration"],
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("NoncurrentVersionExpiration must have NoncurrentDays"))).toBe(true)
      }
    })

    it("should reject Transition with neither Days nor Date", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Transitions: [{ StorageClass: "GLACIER" }] as unknown as LifecycleRuleRead["Transitions"],
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("must have either Days or Date"))).toBe(true)
      }
    })

    it("should reject Transition with both Days and Date", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Transitions: [
          { Days: 30, Date: "2026-12-31T00:00:00.000Z", StorageClass: "GLACIER" },
        ] as LifecycleRuleRead["Transitions"],
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("cannot have both Days and Date"))).toBe(true)
      }
    })

    it("should reject And filter with only 1 predicate", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { And: { Prefix: "x" } },
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("And filter must contain at least 2 predicates"))).toBe(true)
      }
    })

    it("should accept And filter with 2+ tags", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: {
          And: {
            Tags: [
              { Key: "Type", Value: "Archive" },
              { Key: "Team", Value: "Platform" },
            ],
          },
        },
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(true)
    })

    it("should reject multiple top-level filter conditions", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { Prefix: "logs/", Tag: { Key: "env", Value: "prod" } },
        Expiration: { Days: 30 },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("must be wrapped in an And clause"))).toBe(true)
      }
    })

    it("should reject ExpiredObjectDeleteMarker with Days", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Expiration: { Days: 30, ExpiredObjectDeleteMarker: true },
      }
      const result = validateLifecycleRules([rule])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(
          result.errors.some((e) => e.includes("ExpiredObjectDeleteMarker cannot be combined with Days or Date"))
        ).toBe(true)
      }
    })

    it("should accept valid rules and convert them", () => {
      const rules: LifecycleRuleRead[] = [
        { ID: "rule1", Status: "Enabled", Expiration: { Days: 30 } },
        { ID: "rule2", Status: "Disabled", NoncurrentVersionExpiration: { NoncurrentDays: 60 } },
      ]
      const result = validateLifecycleRules(rules)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.rules).toHaveLength(2)
        expect(result.rules[0].ID).toBe("rule1")
        expect(result.rules[1].ID).toBe("rule2")
      }
    })
  })

  describe("isWholeBucketExpirationRule", () => {
    it("should return false if Status is not Enabled", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Disabled",
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(false)
    })

    it("should return false if no Expiration", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(false)
    })

    it("should return true if no Filter", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(true)
    })

    it("should return true if Filter has empty Prefix and no other conditions", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { Prefix: "" },
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(true)
    })

    it("should return false if Filter has non-empty Prefix", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { Prefix: "logs/" },
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(false)
    })

    it("should return false if Filter has Tag", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { Tag: { Key: "env", Value: "prod" } },
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(false)
    })

    it("should return true if Filter.And has empty/no Prefix and no Tags", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { And: { Prefix: "" } },
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(true)
    })

    it("should return false if Filter.And has Tags", () => {
      const rule: LifecycleRuleRead = {
        ID: "test",
        Status: "Enabled",
        Filter: { And: { Tags: [{ Key: "env", Value: "prod" }] } },
        Expiration: { Days: 30 },
      }
      expect(isWholeBucketExpirationRule(rule)).toBe(false)
    })
  })

  describe("formatFilter", () => {
    it("should return 'All objects' when no filter and no legacy prefix", () => {
      expect(formatFilter(undefined)).toBe("All objects")
    })

    it("should format legacy Prefix when no Filter", () => {
      expect(formatFilter(undefined, "logs/")).toBe("Prefix: logs/")
    })

    it("should format simple Prefix", () => {
      expect(formatFilter({ Prefix: "data/" })).toBe("Prefix: data/")
    })

    it("should format Tag", () => {
      expect(formatFilter({ Tag: { Key: "env", Value: "prod" } })).toBe("Tag: env=prod")
    })

    it("should format ObjectSize conditions", () => {
      expect(formatFilter({ ObjectSizeGreaterThan: 1024 })).toBe("Size > 1024 bytes")
      expect(formatFilter({ ObjectSizeLessThan: 2048 })).toBe("Size < 2048 bytes")
    })

    it("should format And with multiple conditions", () => {
      const result = formatFilter({
        And: {
          Prefix: "logs/",
          Tags: [
            { Key: "env", Value: "prod" },
            { Key: "team", Value: "backend" },
          ],
        },
      })
      expect(result).toBe("(Prefix: logs/ AND Tag: env=prod AND Tag: team=backend)")
    })
  })

  describe("formatExpiration", () => {
    it("should return '–' when no expiration", () => {
      expect(formatExpiration(undefined)).toBe("–")
    })

    it("should format Days", () => {
      expect(formatExpiration({ Days: 30 })).toBe("After 30 days")
    })

    it("should format Date from string", () => {
      const inputDate = "2026-12-31T00:00:00.000Z"
      const expected = `On ${new Date(inputDate).toLocaleDateString()}`
      expect(formatExpiration({ Date: inputDate })).toBe(expected)
    })

    it("should format ExpiredObjectDeleteMarker", () => {
      expect(formatExpiration({ ExpiredObjectDeleteMarker: true })).toBe("Clean up expired delete markers")
    })
  })

  describe("formatTransitions", () => {
    it("should return '–' for empty or undefined", () => {
      expect(formatTransitions(undefined)).toBe("–")
      expect(formatTransitions([])).toBe("–")
    })

    it("should format transition with Days", () => {
      expect(formatTransitions([{ Days: 30, StorageClass: "GLACIER" }])).toBe("GLACIER after 30 days")
    })

    it("should format transition with Date", () => {
      const inputDate = "2026-12-31T00:00:00.000Z"
      const expectedDate = new Date(inputDate).toLocaleDateString()
      const result = formatTransitions([{ Date: inputDate, StorageClass: "GLACIER" }])
      expect(result).toBe(`GLACIER after ${expectedDate}`)
    })

    it("should join multiple transitions with semicolon", () => {
      const result = formatTransitions([
        { Days: 30, StorageClass: "STANDARD_IA" },
        { Days: 90, StorageClass: "GLACIER" },
      ])
      expect(result).toBe("STANDARD_IA after 30 days; GLACIER after 90 days")
    })
  })

  describe("formatNoncurrentExpiration", () => {
    it("should return '–' when undefined", () => {
      expect(formatNoncurrentExpiration(undefined)).toBe("–")
    })

    it("should format NoncurrentDays", () => {
      expect(formatNoncurrentExpiration({ NoncurrentDays: 30 })).toBe("After 30 days")
    })

    it("should format NewerNoncurrentVersions", () => {
      expect(formatNoncurrentExpiration({ NoncurrentDays: 30, NewerNoncurrentVersions: 5 })).toBe(
        "After 30 days (keep 5 versions)"
      )
    })
  })

  describe("formatNoncurrentTransitions", () => {
    it("should return '–' for empty or undefined", () => {
      expect(formatNoncurrentTransitions(undefined)).toBe("–")
      expect(formatNoncurrentTransitions([])).toBe("–")
    })

    it("should format transition with NoncurrentDays", () => {
      expect(formatNoncurrentTransitions([{ NoncurrentDays: 30, StorageClass: "GLACIER" }])).toBe(
        "GLACIER after 30 days"
      )
    })

    it("should format with NewerNoncurrentVersions", () => {
      expect(
        formatNoncurrentTransitions([{ NoncurrentDays: 30, StorageClass: "GLACIER", NewerNoncurrentVersions: 3 }])
      ).toBe("GLACIER after 30 days (keep 3)")
    })

    it("should join multiple transitions", () => {
      const result = formatNoncurrentTransitions([
        { NoncurrentDays: 30, StorageClass: "STANDARD_IA" },
        { NoncurrentDays: 90, StorageClass: "GLACIER" },
      ])
      expect(result).toBe("STANDARD_IA after 30 days; GLACIER after 90 days")
    })
  })
})

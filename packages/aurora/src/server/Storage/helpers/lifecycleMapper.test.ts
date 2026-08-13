import { describe, it, expect } from "vitest"
import { normalizeFilter, toSdkLifecycleRules, toWireLifecycleRules } from "./lifecycleMapper"
import type { LifecycleRuleRead, LifecycleRule } from "../types/ceph"

describe("lifecycleMapper", () => {
  describe("normalizeFilter", () => {
    it("should return whole-bucket filter when no conditions", () => {
      expect(normalizeFilter()).toEqual({ Prefix: "" })
      expect(normalizeFilter("", [])).toEqual({ Prefix: "" })
    })

    it("should return Prefix only when only prefix provided", () => {
      expect(normalizeFilter("logs/")).toEqual({ Prefix: "logs/" })
    })

    it("should return Tag only when single tag and no prefix", () => {
      const tag = { Key: "Environment", Value: "production" }
      expect(normalizeFilter(undefined, [tag])).toEqual({ Tag: tag })
    })

    it("should return And when prefix + tags", () => {
      const tags = [{ Key: "Team", Value: "ops" }]
      expect(normalizeFilter("archive/", tags)).toEqual({
        And: {
          Prefix: "archive/",
          Tags: tags,
        },
      })
    })

    it("should return And when multiple tags", () => {
      const tags = [
        { Key: "Environment", Value: "prod" },
        { Key: "Team", Value: "ops" },
      ]
      expect(normalizeFilter(undefined, tags)).toEqual({
        And: {
          Prefix: undefined,
          Tags: tags,
        },
      })
    })

    it("should treat empty prefix as no prefix", () => {
      const tags = [{ Key: "Status", Value: "archived" }]
      expect(normalizeFilter("", tags)).toEqual({ Tag: tags[0] })
    })
  })

  describe("toSdkLifecycleRules / toWireLifecycleRules", () => {
    it("should normalize Expiration.Date to midnight UTC", () => {
      const wireRules: LifecycleRuleRead[] = [
        {
          ID: "test",
          Status: "Enabled",
          Expiration: {
            Date: "2024-12-31T15:30:45.000Z", // Arbitrary time
          },
        },
      ]

      const sdkRules = toSdkLifecycleRules(wireRules)
      const expiration = sdkRules[0].Expiration
      expect(expiration).toBeDefined()
      if (expiration?.Date) {
        const date = typeof expiration.Date === "string" ? new Date(expiration.Date) : expiration.Date
        expect(date.getUTCHours()).toBe(0)
        expect(date.getUTCMinutes()).toBe(0)
        expect(date.getUTCSeconds()).toBe(0)
        expect(date.getUTCMilliseconds()).toBe(0)
        expect(date.getUTCDate()).toBe(31)
        expect(date.getUTCMonth()).toBe(11) // December
        expect(date.getUTCFullYear()).toBe(2024)
      }
    })

    it("should preserve Transitions[].Date as-is (no midnight normalization)", () => {
      const wireRules: LifecycleRuleRead[] = [
        {
          ID: "test",
          Status: "Enabled",
          Transitions: [
            {
              Days: 90,
              StorageClass: "GLACIER",
              Date: "2024-12-31T15:30:45.000Z",
            },
          ],
        },
      ]

      const sdkRules = toSdkLifecycleRules(wireRules)
      const transition = sdkRules[0].Transitions?.[0]
      expect(transition).toBeDefined()
      if (transition?.Date) {
        const date = typeof transition.Date === "string" ? new Date(transition.Date) : transition.Date
        // Should preserve the original time, not normalize to midnight
        expect(date.toISOString()).toBe("2024-12-31T15:30:45.000Z")
      }
    })

    it("should preserve all fields on round-trip", () => {
      const wireRules: LifecycleRuleRead[] = [
        {
          ID: "multi-action",
          Status: "Enabled",
          Filter: {
            And: {
              Prefix: "archive/",
              Tags: [{ Key: "Type", Value: "log" }],
            },
          },
          Expiration: {
            Days: 365,
          },
          Transitions: [
            {
              Days: 90,
              StorageClass: "GLACIER",
            },
          ],
          NoncurrentVersionExpiration: {
            NoncurrentDays: 30,
          },
          NoncurrentVersionTransitions: [
            {
              NoncurrentDays: 15,
              StorageClass: "STANDARD_IA",
            },
          ],
          AbortIncompleteMultipartUpload: {
            DaysAfterInitiation: 7,
          },
        },
      ]

      const sdkRules = toSdkLifecycleRules(wireRules)
      const backToWire = toWireLifecycleRules(sdkRules)

      // All fields except Date (which gets normalized) should match exactly
      expect(backToWire[0].ID).toBe(wireRules[0].ID)
      expect(backToWire[0].Status).toBe(wireRules[0].Status)
      expect(backToWire[0].Filter).toEqual(wireRules[0].Filter)
      expect(backToWire[0].Expiration?.Days).toBe(wireRules[0].Expiration?.Days)
      expect(backToWire[0].Transitions?.[0].Days).toBe(wireRules[0].Transitions?.[0].Days)
      expect(backToWire[0].Transitions?.[0].StorageClass).toBe(wireRules[0].Transitions?.[0].StorageClass)
      expect(backToWire[0].NoncurrentVersionExpiration).toEqual(wireRules[0].NoncurrentVersionExpiration)
      expect(backToWire[0].NoncurrentVersionTransitions).toEqual(wireRules[0].NoncurrentVersionTransitions)
      expect(backToWire[0].AbortIncompleteMultipartUpload).toEqual(wireRules[0].AbortIncompleteMultipartUpload)
    })

    it("should handle rules with no Transitions or Expiration.Date", () => {
      const wireRules: LifecycleRuleRead[] = [
        {
          ID: "simple",
          Status: "Disabled",
          Expiration: {
            Days: 30,
          },
        },
      ]

      const sdkRules = toSdkLifecycleRules(wireRules)
      const backToWire = toWireLifecycleRules(sdkRules)

      expect(backToWire).toEqual(wireRules)
    })

    it("should convert Date objects to ISO strings on toWireLifecycleRules", () => {
      const sdkRules: LifecycleRule[] = [
        {
          ID: "date-test",
          Status: "Enabled",
          Expiration: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Date: new Date("2025-01-01T00:00:00.000Z") as any, // Type assertion needed for test
          },
        },
      ]

      const wireRules = toWireLifecycleRules(sdkRules)
      expect(wireRules[0].Expiration?.Date).toBe("2025-01-01T00:00:00.000Z")
    })
  })
})

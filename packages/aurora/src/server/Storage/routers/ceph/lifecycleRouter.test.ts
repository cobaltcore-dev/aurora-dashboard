import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { lifecycleRouter } from "./lifecycleRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { createMockContext, TEST_PROJECT_ID } from "./mockContext"
import type { LifecycleRule } from "../../types/ceph"

// ============================================================================
// MOCK AWS SDK S3 CLIENT
// ============================================================================

const mockSend = vi.fn()

vi.mock("../../clients/s3Client", () => ({
  createS3Client: vi.fn(() => ({ send: mockSend })),
}))

// ============================================================================
// MOCK DATA
// ============================================================================

const TEST_BUCKET_NAME = "my-test-bucket"

const MOCK_LIFECYCLE_RULES = [
  {
    ID: "delete-old-logs",
    Status: "Enabled",
    Filter: {
      Prefix: "logs/",
    },
    Expiration: {
      Days: 30,
    },
  },
  {
    ID: "archive-data",
    Status: "Enabled",
    Filter: {
      Prefix: "archive/",
    },
    Transitions: [
      {
        Days: 90,
        StorageClass: "GLACIER",
      },
    ],
  },
]

// ============================================================================
// TESTS
// ============================================================================

describe("lifecycleRouter", () => {
  const router = auroraRouter(lifecycleRouter)
  const createCaller = createCallerFactory(router)
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = createMockContext()
    caller = createCaller(ctx)
  })

  describe("get", () => {
    it("should get lifecycle configuration with rules", async () => {
      mockSend.mockResolvedValueOnce({
        Rules: MOCK_LIFECYCLE_RULES,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.rules).not.toBeNull()
      expect(result.rules).toHaveLength(2)
      expect(result.rules?.[0].ID).toBe("delete-old-logs")
      expect(result.rules?.[1].ID).toBe("archive-data")
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should return null when no lifecycle configuration is set", async () => {
      mockSend.mockResolvedValueOnce({
        Rules: undefined,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.rules).toBeNull()
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should return null when NoSuchLifecycleConfiguration error", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchLifecycleConfiguration",
        Code: "NoSuchLifecycleConfiguration",
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.rules).toBeNull()
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        Code: "NoSuchBucket",
        message: "The specified bucket does not exist",
      })

      await expect(
        caller.get({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.get({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("set", () => {
    it("should set lifecycle configuration", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        lifecycleConfiguration: {
          Rules: [
            {
              ID: "delete-old-logs",
              Status: "Enabled",
              Filter: {
                Prefix: "logs/",
              },
              Expiration: {
                Days: 30,
              },
            },
          ],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should set lifecycle configuration with Date expiration", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        lifecycleConfiguration: {
          Rules: [
            {
              Status: "Enabled",
              Expiration: {
                Date: "2024-12-31T00:00:00.000Z",
              },
            },
          ],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
      // Verify Date string was converted to Date object
      const commandCall = mockSend.mock.calls[0][0]
      expect(commandCall.input.LifecycleConfiguration.Rules[0].Expiration.Date).toBeInstanceOf(Date)
    })

    it("should set lifecycle configuration with Transitions", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        lifecycleConfiguration: {
          Rules: [
            {
              Status: "Enabled",
              Transitions: [
                {
                  Days: 30,
                  StorageClass: "STANDARD_IA",
                },
                {
                  Date: "2024-12-31T00:00:00.000Z",
                  StorageClass: "GLACIER",
                },
              ],
            },
          ],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
      // Verify Date strings in transitions were converted to Date objects
      const commandCall = mockSend.mock.calls[0][0]
      expect(commandCall.input.LifecycleConfiguration.Rules[0].Transitions[1].Date).toBeInstanceOf(Date)
    })

    it("should set lifecycle configuration with multiple rules", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        lifecycleConfiguration: {
          Rules: [
            {
              ID: "expire-logs",
              Status: "Enabled",
              Filter: { Prefix: "logs/" },
              Expiration: { Days: 30 },
            },
            {
              ID: "archive-data",
              Status: "Enabled",
              Filter: { Prefix: "data/" },
              Transitions: [{ Days: 90, StorageClass: "GLACIER" }],
            },
            {
              ID: "cleanup-versions",
              Status: "Enabled",
              NoncurrentVersionExpiration: { NoncurrentDays: 90 },
            },
          ],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        Code: "NoSuchBucket",
        message: "The specified bucket does not exist",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Expiration: { Days: 30 },
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Expiration: { Days: 30 },
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should enforce rate limiting (10 changes per minute per bucket)", async () => {
      mockSend.mockResolvedValue({})
      const rateLimitBucket = "rate-limit-test-bucket-unique"

      // Make 9 successful calls (counter starts at 1, so 9 calls brings us to count=9)
      for (let i = 0; i < 9; i++) {
        await caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: rateLimitBucket,
          lifecycleConfiguration: {
            Rules: [{ Status: "Enabled", Expiration: { Days: 30 } }],
          },
        })
      }

      // 10th call should succeed (count=10 exactly, which is the limit)
      await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: rateLimitBucket,
        lifecycleConfiguration: {
          Rules: [{ Status: "Enabled", Expiration: { Days: 30 } }],
        },
      })

      // 11th call should be rate limited (count would be 11, which exceeds limit of 10)
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: rateLimitBucket,
          lifecycleConfiguration: {
            Rules: [{ Status: "Enabled", Expiration: { Days: 30 } }],
          },
        })
      ).rejects.toThrow(/rate limit exceeded/i)
    })

    it("should allow rate limiting per bucket (different buckets have separate limits)", async () => {
      mockSend.mockResolvedValue({})
      const bucket1 = "rate-limit-bucket-1-unique"
      const bucket2 = "rate-limit-bucket-2-unique"

      // Make 10 calls to bucket 1
      for (let i = 0; i < 10; i++) {
        await caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: bucket1,
          lifecycleConfiguration: {
            Rules: [{ Status: "Enabled", Expiration: { Days: 30 } }],
          },
        })
      }

      // Call to bucket 2 should still work (separate rate limit)
      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: bucket2,
        lifecycleConfiguration: {
          Rules: [{ Status: "Enabled", Expiration: { Days: 30 } }],
        },
      })

      expect(result).toBe(true)
    })
  })

  describe("delete", () => {
    it("should delete lifecycle configuration", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.delete({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should be idempotent when no lifecycle configuration exists (NoSuchLifecycleConfiguration)", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchLifecycleConfiguration",
        Code: "NoSuchLifecycleConfiguration",
      })

      const result = await caller.delete({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        Code: "NoSuchBucket",
        message: "The specified bucket does not exist",
      })

      await expect(
        caller.delete({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.delete({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("schema validation", () => {
    it("should reject empty Rules array", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject rule with no actions", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                ID: "no-actions",
                Status: "Enabled",
                Filter: { Prefix: "logs/" },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject rule with both Days and Date in Expiration", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Expiration: {
                  Days: 30,
                  Date: "2024-12-31T00:00:00.000Z",
                },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject duplicate rule IDs", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                ID: "same-id",
                Status: "Enabled",
                Expiration: { Days: 30 },
              },
              {
                ID: "same-id",
                Status: "Enabled",
                Expiration: { Days: 60 },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject both Filter and legacy Prefix", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Prefix: "logs/",
                Filter: { Prefix: "data/" },
                Expiration: { Days: 30 },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject ID over 255 characters", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                ID: "a".repeat(256),
                Status: "Enabled",
                Expiration: { Days: 30 },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject And filter with only 1 predicate", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Filter: {
                  And: {
                    Tags: [{ Key: "Type", Value: "log" }],
                  },
                },
                Expiration: { Days: 30 },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should reject ExpiredObjectDeleteMarker with tag filter", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Filter: { Tag: { Key: "Type", Value: "log" } },
                Expiration: { ExpiredObjectDeleteMarker: true },
              },
            ],
          },
        })
      ).rejects.toThrow()
    })

    it("should map MalformedXML to BAD_REQUEST", async () => {
      mockSend.mockRejectedValueOnce({
        name: "MalformedXML",
        Code: "MalformedXML",
        message: "Malformed lifecycle configuration",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          lifecycleConfiguration: {
            Rules: [
              {
                Status: "Enabled",
                Expiration: { Days: 1 },
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should preserve untouched rules with Transitions byte-identical during edit", async () => {
      // This test verifies round-trip fidelity: editing one rule should leave
      // other rules' Transitions (and all other fields) completely unchanged
      const originalRules = [
        {
          ID: "rule-being-edited",
          Status: "Enabled",
          Filter: { Prefix: "logs/" },
          Expiration: { Days: 90 },
        },
        {
          ID: "rule-with-transitions",
          Status: "Enabled",
          Filter: { Prefix: "archive/" },
          Expiration: { Days: 365 },
          Transitions: [
            { Days: 30, StorageClass: "GLACIER" },
            { Days: 90, StorageClass: "DEEP_ARCHIVE" },
          ],
          NoncurrentVersionTransitions: [{ NoncurrentDays: 60, StorageClass: "GLACIER" }],
        },
        {
          ID: "another-rule",
          Status: "Disabled",
          Filter: { Prefix: "temp/" },
          Expiration: { Days: 7 },
        },
      ]

      // Mock get to return these rules
      mockSend.mockResolvedValueOnce({ Rules: originalRules })

      const getResult = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      // Now edit the first rule (change its Status)
      const editedRules = getResult.rules!.map((rule, index) => {
        if (index === 0) {
          return { ...rule, Status: "Disabled" as const }
        }
        return rule
      }) as LifecycleRule[]

      // Set the edited configuration
      mockSend.mockResolvedValueOnce({})
      await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        lifecycleConfiguration: { Rules: editedRules },
      })

      // Verify the send command was called
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object))

      // Extract the Rules sent to S3
      const setCall = mockSend.mock.calls.find((call) => {
        const command = call[0]
        return command.constructor.name === "PutBucketLifecycleConfigurationCommand"
      })
      expect(setCall).toBeDefined()

      const sentRules = setCall![0].input.LifecycleConfiguration.Rules

      // Verify the second rule (with Transitions) is byte-identical to the original
      expect(sentRules[1].ID).toBe("rule-with-transitions")
      expect(sentRules[1].Transitions).toEqual(originalRules[1].Transitions)
      expect(sentRules[1].NoncurrentVersionTransitions).toEqual(originalRules[1].NoncurrentVersionTransitions)
      expect(sentRules[1].Expiration).toEqual(originalRules[1].Expiration)
      expect(sentRules[1].Filter).toEqual(originalRules[1].Filter)
      expect(sentRules[1].Status).toBe("Enabled")

      // Verify the third rule is also unchanged
      expect(sentRules[2].ID).toBe("another-rule")
      expect(sentRules[2].Status).toBe("Disabled")
      expect(sentRules[2].Expiration).toEqual(originalRules[2].Expiration)

      // Verify the first rule was edited correctly
      expect(sentRules[0].ID).toBe("rule-being-edited")
      expect(sentRules[0].Status).toBe("Disabled")
    })
  })
})

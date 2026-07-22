import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { corsRouter } from "./corsRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { createMockContext, TEST_PROJECT_ID } from "./mockContext"
import type { CorsRule } from "../../types/ceph"

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

const VALID_CORS_RULE: CorsRule = {
  ID: "rule1",
  AllowedHeaders: ["*"],
  AllowedMethods: ["GET", "PUT"],
  AllowedOrigins: ["https://example.com"],
  ExposeHeaders: ["ETag", "Content-Length"],
  MaxAgeSeconds: 3600,
}

const MINIMAL_CORS_RULE: CorsRule = {
  AllowedMethods: ["GET"],
  AllowedOrigins: ["*"],
}

const COMPLEX_CORS_RULES: CorsRule[] = [
  {
    ID: "rule1",
    AllowedHeaders: ["Authorization", "Content-Type"],
    AllowedMethods: ["GET", "HEAD"],
    AllowedOrigins: ["https://app.example.com", "https://admin.example.com"],
    ExposeHeaders: ["ETag", "x-amz-meta-custom"],
    MaxAgeSeconds: 7200,
  },
  {
    ID: "rule2",
    AllowedMethods: ["PUT", "POST", "DELETE"],
    AllowedOrigins: ["https://upload.example.com"],
    MaxAgeSeconds: 3600,
  },
]

// ============================================================================
// TESTS
// ============================================================================

describe("corsRouter", () => {
  const router = auroraRouter(corsRouter)
  const createCaller = createCallerFactory(router)
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = createMockContext()
    caller = createCaller(ctx)
  })

  describe("get", () => {
    it("should return CORS rules when configuration exists", async () => {
      mockSend.mockResolvedValueOnce({
        CORSRules: [VALID_CORS_RULE],
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.corsRules).not.toBeNull()
      expect(result.corsRules).toHaveLength(1)
      expect(result.corsRules?.[0].ID).toBe("rule1")
      expect(result.corsRules?.[0].AllowedMethods).toEqual(["GET", "PUT"])
      expect(result.corsRules?.[0].AllowedOrigins).toEqual(["https://example.com"])
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should return CORS rules with complex configuration", async () => {
      mockSend.mockResolvedValueOnce({
        CORSRules: COMPLEX_CORS_RULES,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.corsRules).not.toBeNull()
      expect(result.corsRules).toHaveLength(2)
      expect(result.corsRules?.[0].ID).toBe("rule1")
      expect(result.corsRules?.[1].ID).toBe("rule2")
      expect(result.corsRules?.[0].AllowedOrigins).toHaveLength(2)
    })

    it("should return minimal CORS rule without optional fields", async () => {
      mockSend.mockResolvedValueOnce({
        CORSRules: [MINIMAL_CORS_RULE],
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.corsRules).not.toBeNull()
      expect(result.corsRules).toHaveLength(1)
      expect(result.corsRules?.[0].AllowedMethods).toEqual(["GET"])
      expect(result.corsRules?.[0].AllowedOrigins).toEqual(["*"])
      expect(result.corsRules?.[0].ID).toBeUndefined()
      expect(result.corsRules?.[0].AllowedHeaders).toBeUndefined()
    })

    it("should return null when no CORS configuration is set", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchCORSConfiguration",
        message: "The CORS configuration does not exist",
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.corsRules).toBeNull()
    })

    it("should return null when CORSRules is undefined", async () => {
      mockSend.mockResolvedValueOnce({
        CORSRules: undefined,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.corsRules).toBeNull()
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        message: "The bucket does not exist",
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

    it("should throw FORBIDDEN on access denied", async () => {
      mockSend.mockRejectedValueOnce({
        name: "AccessDenied",
        message: "Access Denied",
      })

      await expect(
        caller.get({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("set", () => {
    it("should set CORS configuration with valid rules", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        corsConfiguration: {
          CORSRules: [VALID_CORS_RULE],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should set CORS configuration with multiple rules", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        corsConfiguration: {
          CORSRules: COMPLEX_CORS_RULES,
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should set CORS configuration with minimal rule", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        corsConfiguration: {
          CORSRules: [MINIMAL_CORS_RULE],
        },
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw BAD_REQUEST with empty CORSRules array", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with invalid AllowedMethod", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ["INVALID_METHOD" as any],
                AllowedOrigins: ["*"],
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with empty AllowedMethods array", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                AllowedMethods: [],
                AllowedOrigins: ["*"],
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with empty AllowedOrigins array", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ["GET"],
                AllowedOrigins: [],
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with MaxAgeSeconds above limit", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ["GET"],
                AllowedOrigins: ["*"],
                MaxAgeSeconds: 86401, // 24 hours + 1 second
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with negative MaxAgeSeconds", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ["GET"],
                AllowedOrigins: ["*"],
                MaxAgeSeconds: -1,
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with ID exceeding 255 characters", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [
              {
                ID: "a".repeat(256),
                AllowedMethods: ["GET"],
                AllowedOrigins: ["*"],
              },
            ],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should accept MaxAgeSeconds at 0", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        corsConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ["GET"],
              AllowedOrigins: ["*"],
              MaxAgeSeconds: 0,
            },
          ],
        },
      })

      expect(result).toBe(true)
    })

    it("should accept MaxAgeSeconds at 86400 (24 hours)", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        corsConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ["GET"],
              AllowedOrigins: ["*"],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      })

      expect(result).toBe(true)
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        message: "The bucket does not exist",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [VALID_CORS_RULE],
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
          corsConfiguration: {
            CORSRules: [VALID_CORS_RULE],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw FORBIDDEN on access denied", async () => {
      mockSend.mockRejectedValueOnce({
        name: "AccessDenied",
        message: "Access Denied",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [VALID_CORS_RULE],
          },
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST on malformed XML from S3", async () => {
      mockSend.mockRejectedValueOnce({
        name: "MalformedXML",
        message: "The XML is malformed",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          corsConfiguration: {
            CORSRules: [VALID_CORS_RULE],
          },
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("delete", () => {
    it("should delete existing CORS configuration", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.delete({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should succeed when no CORS configuration exists (idempotent)", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchCORSConfiguration",
        message: "The CORS configuration does not exist",
      })

      const result = await caller.delete({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result).toBe(true)
    })

    it("should throw NOT_FOUND when bucket does not exist", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucket",
        message: "The bucket does not exist",
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

    it("should throw FORBIDDEN on access denied", async () => {
      mockSend.mockRejectedValueOnce({
        name: "AccessDenied",
        message: "Access Denied",
      })

      await expect(
        caller.delete({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })
  })
})

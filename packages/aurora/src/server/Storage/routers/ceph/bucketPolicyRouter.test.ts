import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { bucketPolicyRouter } from "./bucketPolicyRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { createMockContext, TEST_PROJECT_ID } from "./mockContext"

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

const VALID_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: "arn:aws:s3:::my-test-bucket/*",
    },
  ],
}

const VALID_POLICY_JSON = JSON.stringify(VALID_POLICY)

const COMPLEX_POLICY = {
  Version: "2012-10-17",
  Id: "MyBucketPolicy",
  Statement: [
    {
      Sid: "PublicRead",
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject", "s3:GetObjectVersion"],
      Resource: ["arn:aws:s3:::my-test-bucket/*", "arn:aws:s3:::my-test-bucket"],
      Condition: {
        IpAddress: {
          "aws:SourceIp": "192.168.1.0/24",
        },
      },
    },
    {
      Sid: "SpecificUserAccess",
      Effect: "Allow",
      Principal: {
        AWS: "arn:aws:iam::123456789012:user/test-user",
      },
      Action: "s3:*",
      Resource: "arn:aws:s3:::my-test-bucket/*",
    },
  ],
}

// ============================================================================
// TESTS
// ============================================================================

describe("bucketPolicyRouter", () => {
  const router = auroraRouter(bucketPolicyRouter)
  const createCaller = createCallerFactory(router)
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = createMockContext()
    caller = createCaller(ctx)
  })

  describe("get", () => {
    it("should return parsed policy when policy exists", async () => {
      mockSend.mockResolvedValueOnce({
        Policy: VALID_POLICY_JSON,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).not.toBeNull()
      expect(result.policy?.Version).toBe("2012-10-17")
      expect(result.policy?.Statement).toHaveLength(1)
      expect(result.policy?.Statement[0].Effect).toBe("Allow")
      expect(result.policyText).toBe(VALID_POLICY_JSON)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should return parsed policy with complex structure", async () => {
      const complexPolicyJson = JSON.stringify(COMPLEX_POLICY)
      mockSend.mockResolvedValueOnce({
        Policy: complexPolicyJson,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).not.toBeNull()
      expect(result.policy?.Statement).toHaveLength(2)
      expect(result.policy?.Id).toBe("MyBucketPolicy")
      expect(result.policy?.Statement[0].Sid).toBe("PublicRead")
      expect(result.policy?.Statement[1].Sid).toBe("SpecificUserAccess")
      expect(result.policyText).toBe(complexPolicyJson)
    })

    it("should return null when no policy is set", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucketPolicy",
        message: "The bucket policy does not exist",
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).toBeNull()
      expect(result.policyText).toBeNull()
    })

    it("should return null when policy is empty", async () => {
      mockSend.mockResolvedValueOnce({
        Policy: null,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).toBeNull()
      expect(result.policyText).toBeNull()
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
    it("should set policy with valid JSON", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        policy: VALID_POLICY_JSON,
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should set policy with complex structure", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        policy: JSON.stringify(COMPLEX_POLICY),
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw BAD_REQUEST with invalid JSON", async () => {
      const invalidJson = '{ "Version": "2012-10-17", "Statement": [invalid] }'

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          policy: invalidJson,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with invalid policy structure - missing required fields", async () => {
      const invalidPolicy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            // Missing Principal, Action, Resource
          },
        ],
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          policy: invalidPolicy,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST with invalid Effect value", async () => {
      const invalidPolicy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Maybe", // Invalid - must be "Allow" or "Deny"
            Principal: "*",
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::my-test-bucket/*",
          },
        ],
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          policy: invalidPolicy,
        })
      ).rejects.toThrow(TRPCError)
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
          policy: VALID_POLICY_JSON,
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
          policy: VALID_POLICY_JSON,
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
          policy: VALID_POLICY_JSON,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw BAD_REQUEST on malformed policy from S3", async () => {
      mockSend.mockRejectedValueOnce({
        name: "MalformedPolicy",
        message: "The policy is malformed",
      })

      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: TEST_BUCKET_NAME,
          policy: VALID_POLICY_JSON,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should accept policy with optional fields", async () => {
      mockSend.mockResolvedValueOnce({})

      const policyWithOptionals = JSON.stringify({
        Version: "2012-10-17",
        Id: "OptionalPolicyId",
        Statement: [
          {
            Sid: "OptionalStatementId",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::my-test-bucket/*",
            Condition: {
              IpAddress: {
                "aws:SourceIp": "10.0.0.0/8",
              },
            },
          },
        ],
      })

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        policy: policyWithOptionals,
      })

      expect(result).toBe(true)
    })
  })

  describe("delete", () => {
    it("should delete existing policy", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.delete({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should succeed when no policy exists (idempotent)", async () => {
      mockSend.mockRejectedValueOnce({
        name: "NoSuchBucketPolicy",
        message: "The bucket policy does not exist",
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

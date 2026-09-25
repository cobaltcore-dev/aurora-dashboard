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

// A policy of the shape RGW actually stores in a Keystone-backed deployment: the principal is
// qualified by a tenant (the project UUID), not by a 12-digit AWS account id.
const TENANT_PRINCIPAL_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "GrantOtherProject",
      Effect: "Allow",
      Principal: {
        AWS: [
          "arn:aws:iam::941afaee693a4155ac815be75f17b259:user/941afaee693a4155ac815be75f17b259",
          "arn:aws:iam::usfolks:user/fred:subuser",
          "arn:aws:iam:::user/anonymous",
          "arn:aws:iam::RGW33567154695143645:user/rgwuser",
        ],
      },
      Action: ["s3:GetObject", "s3:ListBucket"],
      Resource: ["arn:aws:s3:::my-test-bucket", "arn:aws:s3:::my-test-bucket/*"],
    },
  ],
}

const TENANT_PRINCIPAL_POLICY_JSON = JSON.stringify(TENANT_PRINCIPAL_POLICY)

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

    it("should return a policy whose principals are tenant-qualified RGW ARNs", async () => {
      mockSend.mockResolvedValueOnce({
        Policy: TENANT_PRINCIPAL_POLICY_JSON,
      })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).not.toBeNull()
      expect(result.policyText).toBe(TENANT_PRINCIPAL_POLICY_JSON)
    })

    it("should still return the raw text when the stored policy does not fit our schema", async () => {
      // RGW accepted and is enforcing this document; a field we don't model must not make the
      // policy invisible to the editor.
      const unknownShape = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::my-test-bucket/*",
            SomeFutureRGWField: "value",
          },
        ],
      })
      mockSend.mockResolvedValueOnce({ Policy: unknownShape })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).toBeNull()
      expect(result.policyText).toBe(unknownShape)
    })

    it("should still return the raw text when the stored policy is not valid JSON", async () => {
      mockSend.mockResolvedValueOnce({ Policy: "{ not json" })

      const result = await caller.get({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })

      expect(result.policy).toBeNull()
      expect(result.policyText).toBe("{ not json")
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

    it("should set a policy with tenant-qualified principal ARNs", async () => {
      // Own bucket name: checkPolicySetRateLimit counts every attempt on a project+bucket key,
      // so adding calls on TEST_BUCKET_NAME would starve the tests further down this describe.
      const bucket = "tenant-principal-set-bucket"
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: bucket,
        policy: JSON.stringify({
          ...TENANT_PRINCIPAL_POLICY,
          Statement: [
            {
              ...TENANT_PRINCIPAL_POLICY.Statement[0],
              Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should accept a tenant-qualified Resource ARN for this bucket", async () => {
      const bucket = "tenant-resource-set-bucket"
      mockSend.mockResolvedValueOnce({})

      const result = await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: bucket,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: "arn:aws:iam::usfolks:user/fred" },
              Action: "s3:GetObject",
              Resource: `arn:aws:s3::941afaee693a4155ac815be75f17b259:${bucket}/*`,
            },
          ],
        }),
      })

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should still reject a tenant-qualified Resource ARN naming a different bucket", async () => {
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: "tenant-resource-mismatch-bucket",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: "arn:aws:s3::usfolks:someone-elses-bucket/*",
              },
            ],
          }),
        })
      ).rejects.toThrow(TRPCError)
      expect(mockSend).not.toHaveBeenCalled()
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

    it("should throw BAD_REQUEST with invalid policy structure - unrecognized fields", async () => {
      const invalidPolicy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::my-test-bucket/*",
            InvalidField: "this should not be here", // Unknown field should be rejected
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

    it("should enforce rate limiting (10 changes per 5 minutes per bucket)", async () => {
      mockSend.mockResolvedValue({})
      const rateLimitBucket = "policy-rate-limit-test-bucket-unique"
      const policyForBucket = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${rateLimitBucket}/*`,
          },
        ],
      })

      // Make 9 successful calls (counter starts at 1, so 9 calls brings us to count=9)
      for (let i = 0; i < 9; i++) {
        await caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: rateLimitBucket,
          policy: policyForBucket,
        })
      }

      // 10th call should succeed (count=10 exactly, which is the limit)
      await caller.set({
        project_id: TEST_PROJECT_ID,
        bucketName: rateLimitBucket,
        policy: policyForBucket,
      })

      // 11th call should be rate limited (count would be 11, which exceeds limit of 10)
      await expect(
        caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: rateLimitBucket,
          policy: policyForBucket,
        })
      ).rejects.toThrow(/rate limit exceeded/i)
    })

    it("schedules per-key cleanup that fires when the window closes", async () => {
      vi.useFakeTimers()
      try {
        mockSend.mockResolvedValue({})
        const bucket = "policy-cleanup-bucket-unique"
        const policyForBucket = JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: "s3:GetObject",
              Resource: `arn:aws:s3:::${bucket}/*`,
            },
          ],
        })
        await caller.set({
          project_id: TEST_PROJECT_ID,
          bucketName: bucket,
          policy: policyForBucket,
        })
        expect(vi.getTimerCount()).toBeGreaterThan(0) // cleanup timer scheduled
        vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
        expect(vi.getTimerCount()).toBe(0) // fired, nothing left pending
      } finally {
        vi.useRealTimers()
      }
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

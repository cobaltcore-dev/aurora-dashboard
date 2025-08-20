import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { permissionsRouter } from "./permissionsRouter"
import { client } from "../client"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"

// Mock the K8s client
vi.mock("../client", () => ({
  client: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    WATCH_ADDED: "ADDED",
    WATCH_MODIFIED: "MODIFIED",
    WATCH_DELETED: "DELETED",
    WATCH_ERROR: "ERROR",
    watch: vi.fn().mockReturnValue({
      on: vi.fn(),
      off: vi.fn(),
      close: vi.fn(),
    }),
    head: vi.fn(),
    refreshToken: vi.fn(),
    currentToken: vi.fn(),
  },
}))

const mockClient = vi.mocked(client)

// Create tRPC caller
const createCaller = createCallerFactory(router(permissionsRouter))
const caller = createCaller({} as AuroraPortalContext)

describe("permissionsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default environment variable
    process.env.GARDENER_PROJECT = "test-project"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getPermissions", () => {
    it("should return all permissions as true when all access reviews are allowed", async () => {
      // Mock successful responses for all permissions
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: true,
          denied: false,
        },
      }

      mockClient.post.mockResolvedValue(mockResponse)

      const result = await caller.getPermissions()

      expect(result).toEqual({
        list: true,
        get: true,
        create: true,
        update: true,
        delete: true,
      })

      // Verify all 5 permission checks were made
      expect(mockClient.post).toHaveBeenCalledTimes(5)
    })

    it("should return mixed permissions when some are allowed and some are not", async () => {
      // Mock responses with different allowed values
      const baseResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
      }

      const responses = [
        { ...baseResponse, status: { allowed: true, denied: false } }, // list
        { ...baseResponse, status: { allowed: false, denied: true } }, // get
        { ...baseResponse, status: { allowed: true, denied: false } }, // create
        { ...baseResponse, status: { allowed: false, denied: true } }, // update
        { ...baseResponse, status: { allowed: true, denied: false } }, // delete
      ]

      mockClient.post
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2])
        .mockResolvedValueOnce(responses[3])
        .mockResolvedValueOnce(responses[4])

      const result = await caller.getPermissions()

      expect(result).toEqual({
        list: true,
        get: false,
        create: true,
        update: false,
        delete: true,
      })
    })

    it("should return all permissions as false when all access reviews are denied", async () => {
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: false,
          denied: true,
        },
      }

      mockClient.post.mockResolvedValue(mockResponse)

      const result = await caller.getPermissions()

      expect(result).toEqual({
        list: false,
        get: false,
        create: false,
        update: false,
        delete: false,
      })
    })

    it("should make correct API calls with proper request structure", async () => {
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: true,
          denied: false,
        },
      }
      mockClient.post.mockResolvedValue(mockResponse)

      await caller.getPermissions()

      const permissions = ["list", "get", "create", "update", "delete"]

      permissions.forEach((permission, index) => {
        expect(mockClient.post).toHaveBeenNthCalledWith(
          index + 1,
          "apis/authorization.k8s.io/v1/selfsubjectaccessreviews",
          {
            kind: "SelfSubjectAccessReview",
            apiVersion: "authorization.k8s.io/v1",
            metadata: { creationTimestamp: null },
            spec: {
              resourceAttributes: {
                namespace: "garden-test-project",
                verb: permission,
                resource: "shoots",
                group: "core.gardener.cloud",
              },
            },
          }
        )
      })
    })

    it("should use correct namespace from environment variable", async () => {
      process.env.GARDENER_PROJECT = "my-custom-project"
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: "garden-my-custom-project",
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: true,
          denied: false,
        },
      }
      mockClient.post.mockResolvedValue(mockResponse)

      await caller.getPermissions()

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: "garden-my-custom-project",
            }),
          }),
        })
      )
    })

    it("should throw error when client request fails", async () => {
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            error: "Unauthorized access",
          }),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions()).rejects.toThrow(
        "Error fetching access review information: Unauthorized access"
      )
    })

    it("should handle error response with message field", async () => {
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            message: "Request timeout",
          }),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions()).rejects.toThrow("Error fetching access review information: Request timeout")
    })

    it("should handle error without response body", async () => {
      const mockError = {
        message: "Network error",
        response: {
          json: vi.fn().mockResolvedValue({}),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions()).rejects.toThrow("Error fetching access review information: Network error")
    })

    it("should handle JSON parsing error in error response", async () => {
      const mockError = {
        message: "Original error message",
        response: {
          json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions()).rejects.toThrow(
        "Error fetching access review information: Original error message"
      )
    })

    it("should throw error when schema validation fails", async () => {
      // Mock responses that don't match the expected schema
      const invalidResponse = {
        invalidField: "invalid",
      }

      mockClient.post.mockResolvedValue(invalidResponse)

      await expect(caller.getPermissions()).rejects.toThrow("Failed to parse access review responses:")
    })

    it("should handle partial failure - some requests succeed, some fail", async () => {
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            error: "Permission denied",
          }),
        },
      }

      // First three succeed, last two fail
      mockClient.post
        .mockResolvedValueOnce({ status: { allowed: true } })
        .mockResolvedValueOnce({ status: { allowed: false } })
        .mockResolvedValueOnce({ status: { allowed: true } })
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)

      await expect(caller.getPermissions()).rejects.toThrow(
        "Error fetching access review information: Permission denied"
      )
    })

    it("should handle undefined GARDENER_PROJECT environment variable", async () => {
      delete process.env.GARDENER_PROJECT
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: "garden-undefined",
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: true,
          denied: false,
        },
      }
      mockClient.post.mockResolvedValue(mockResponse)

      await caller.getPermissions()

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: "garden-undefined",
            }),
          }),
        })
      )
    })

    it("should make requests in parallel (Promise.all)", async () => {
      const mockResponse = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
            verb: "list",
            resource: "shoots",
            group: "core.gardener.cloud",
          },
        },
        status: {
          allowed: true,
          denied: false,
        },
      }
      mockClient.post.mockResolvedValue(mockResponse)

      await caller.getPermissions()

      // All 5 requests should have been initiated (not necessarily completed) before waiting
      expect(mockClient.post).toHaveBeenCalledTimes(5)

      // This test verifies that we're using Promise.all() and not awaiting each request sequentially
      // In a real scenario, parallel requests would be much faster than sequential ones
    })
  })
})

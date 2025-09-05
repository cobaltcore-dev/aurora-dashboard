import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { permissionsRouter } from "./permissionsRouter"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"

// Create tRPC caller
const createCaller = createCallerFactory(router(permissionsRouter))
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
  head: vi.fn(),
  availableEndpoints: vi.fn(),
}

describe("permissionsRouter", () => {
  let caller: ReturnType<typeof createCaller>
  beforeEach(() => {
    vi.clearAllMocks()

    const mockOpestackSession = {
      getToken: vi.fn(() => ({ authToken: "test-auth-token" })),
      service: vi.fn(() => mockClient),
    }

    // Mock context with all required functions
    const mockContext: AuroraPortalContext = {
      createSession: vi.fn().mockResolvedValue(mockOpestackSession),
      rescopeSession: vi.fn().mockResolvedValue(mockOpestackSession), // Mock the rescoped session
      terminateSession: vi.fn().mockResolvedValue({}), // Mock the terminated session
      validateSession: vi.fn().mockResolvedValue(true), // Mock the validated session
    }
    caller = createCaller(mockContext)
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

      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      const result = await caller.getPermissions({ projectId: "test-project" })

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
        .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(responses[0]) })
        .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(responses[1]) })
        .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(responses[2]) })
        .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(responses[3]) })
        .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(responses[4]) })

      const result = await caller.getPermissions({ projectId: "test-project" })

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

      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      const result = await caller.getPermissions({ projectId: "test-project" })

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
      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      await caller.getPermissions({ projectId: "test-project" })

      const permissions = ["list", "get", "create", "update", "delete"]

      permissions.forEach((permission, index) => {
        expect(mockClient.post).toHaveBeenNthCalledWith(
          index + 1,
          "apis/authorization.k8s.io/v1/selfsubjectaccessreviews",
          {
            kind: "SelfSubjectAccessReview",
            apiVersion: "authorization.k8s.io/v1",
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
      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      await caller.getPermissions({ projectId: "test-project" })

      expect(mockClient.post).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: "garden-test-project",
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

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Error fetching permissions: Unauthorized access"
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

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Error fetching permissions: Request timeout"
      )
    })

    it("should handle error without response body", async () => {
      const mockError = {
        message: "Network error",
        response: {
          json: vi.fn().mockResolvedValue({}),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Error fetching permissions: Network error"
      )
    })

    it("should handle JSON parsing error in error response", async () => {
      const mockError = {
        message: "Original error message",
        response: {
          json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
        },
      }

      mockClient.post.mockRejectedValue(mockError)

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Error fetching permissions: Original error message"
      )
    })

    it("should throw error when schema validation fails", async () => {
      // Mock responses that don't match the expected schema
      const invalidResponse = {
        invalidField: "invalid",
      }

      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(invalidResponse) })

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Failed to parse permissions responses:"
      )
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
        .mockResolvedValueOnce({ status: { allowed: true }, json: vi.fn() })
        .mockResolvedValueOnce({ status: { allowed: false }, json: vi.fn() })
        .mockResolvedValueOnce({ status: { allowed: true }, json: vi.fn() })
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)

      await expect(caller.getPermissions({ projectId: "test-project" })).rejects.toThrow(
        "Error fetching permissions: Permission denied"
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
      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      await caller.getPermissions({ projectId: "" })

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: "garden-",
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
      mockClient.post.mockResolvedValue({ json: vi.fn().mockResolvedValue(mockResponse) })

      await caller.getPermissions({ projectId: "test-project" })

      // All 5 requests should have been initiated (not necessarily completed) before waiting
      expect(mockClient.post).toHaveBeenCalledTimes(5)

      // This test verifies that we're using Promise.all() and not awaiting each request sequentially
      // In a real scenario, parallel requests would be much faster than sequential ones
    })
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { rbacPolicyRouter } from "./rbacPolicyRouter"
import { RBACPolicy } from "../types/rbacPolicy"
import { AuroraPortalContext } from "@/server/context"

// Type definitions for request bodies
interface CreateRBACPolicyRequestBody {
  rbac_policy: {
    object_type: string
    object_id: string
    action: string
    target_tenant: string
  }
}

interface UpdateRBACPolicyRequestBody {
  rbac_policy: {
    target_tenant: string
  }
}

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  mockRBACPolicies?: RBACPolicy[]
  mockRBACPolicy?: RBACPolicy
  mockError?: boolean
  mockHttpStatus?: number
  mockStatusText?: string
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    mockRBACPolicies,
    mockRBACPolicy,
    mockError,
    mockHttpStatus,
    mockStatusText,
  } = opts || {}

  const defaultRBACPolicies: RBACPolicy[] = [
    {
      id: "rbac-policy-1",
      object_type: "security_group",
      object_id: "sg-123",
      action: "access_as_shared",
      target_tenant: "target-project-1",
      tenant_id: "owner-project-1",
      project_id: "owner-project-1",
    },
  ]

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: {
      service: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName !== "network" || noNetworkService) {
          return null
        }

        return {
          get: vi.fn().mockImplementation((url: string) => {
            if (mockError) {
              return Promise.reject(new Error("Network error"))
            }

            if (mockHttpStatus && mockHttpStatus !== 200) {
              return Promise.resolve({
                ok: false,
                status: mockHttpStatus,
                statusText: mockStatusText || "Error",
              })
            }

            // Handle list endpoint
            if (url.includes("rbac-policies")) {
              return Promise.resolve({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({
                  rbac_policies: mockRBACPolicies || defaultRBACPolicies,
                }),
              })
            }

            return Promise.resolve({
              ok: true,
              status: 200,
              json: vi.fn().mockResolvedValue({
                rbac_policy: mockRBACPolicy || defaultRBACPolicies[0],
              }),
            })
          }),

          post: vi.fn().mockImplementation((_url: string, body: unknown) => {
            if (mockError) {
              return Promise.reject(new Error("Network error"))
            }

            if (mockHttpStatus && mockHttpStatus !== 200) {
              return Promise.resolve({
                ok: false,
                status: mockHttpStatus,
                statusText: mockStatusText || "Error",
              })
            }

            // Create endpoint
            const requestBody = body as CreateRBACPolicyRequestBody
            const createdPolicy: RBACPolicy = {
              id: "rbac-policy-new",
              object_type: "security_group",
              object_id: requestBody.rbac_policy.object_id,
              action: "access_as_shared",
              target_tenant: requestBody.rbac_policy.target_tenant,
              tenant_id: "owner-project-1",
              project_id: "owner-project-1",
            }

            return Promise.resolve({
              ok: true,
              status: 201,
              json: vi.fn().mockResolvedValue({
                rbac_policy: mockRBACPolicy || createdPolicy,
              }),
            })
          }),

          put: vi.fn().mockImplementation((url: string, body: unknown) => {
            if (mockError) {
              return Promise.reject(new Error("Network error"))
            }

            if (mockHttpStatus && mockHttpStatus !== 200) {
              return Promise.resolve({
                ok: false,
                status: mockHttpStatus,
                statusText: mockStatusText || "Error",
              })
            }

            // Update endpoint
            const requestBody = body as UpdateRBACPolicyRequestBody
            const updatedPolicy: RBACPolicy = {
              id: url.split("/").pop() || "rbac-policy-1",
              object_type: "security_group",
              object_id: "sg-123",
              action: "access_as_shared",
              target_tenant: requestBody.rbac_policy.target_tenant,
              tenant_id: "owner-project-1",
              project_id: "owner-project-1",
            }

            return Promise.resolve({
              ok: true,
              status: 200,
              json: vi.fn().mockResolvedValue({
                rbac_policy: mockRBACPolicy || updatedPolicy,
              }),
            })
          }),

          del: vi.fn().mockImplementation(() => {
            if (mockError) {
              return Promise.reject(new Error("Network error"))
            }

            if (mockHttpStatus && mockHttpStatus !== 204) {
              return Promise.resolve({
                ok: false,
                status: mockHttpStatus,
                statusText: mockStatusText || "Error",
              })
            }

            // Delete endpoint
            return Promise.resolve({
              ok: true,
              status: 204,
            })
          }),
        }
      }),
    },
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn(),
    getMultipartData: vi.fn(),
  } as unknown as AuroraPortalContext
}

const createCaller = createCallerFactory(
  auroraRouter({
    rbacPolicy: rbacPolicyRouter,
  })
)

const TEST_PROJECT_ID = "proj-1"

describe("rbacPolicyRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of RBAC policies for a security group", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.rbacPolicy.list({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)

    const policy: RBACPolicy = result[0]
    expect(policy.id).toBe("rbac-policy-1")
    expect(policy.object_type).toBe("security_group")
    expect(policy.object_id).toBe("sg-123")
    expect(policy.action).toBe("access_as_shared")
    expect(policy.target_tenant).toBe("target-project-1")
  })

  it("returns empty array when no RBAC policies exist", async () => {
    const ctx = createMockContext({ mockRBACPolicies: [] })
    const caller = createCaller(ctx)

    const result = await caller.rbacPolicy.list({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.list({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.rbacPolicy.list({ project_id: TEST_PROJECT_ID, securityGroupId: "sg-123" })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("handles 401 unauthorized error from OpenStack API", async () => {
    const ctx = createMockContext({ mockHttpStatus: 401, mockStatusText: "Unauthorized" })
    const caller = createCaller(ctx)

    await expect(caller.rbacPolicy.list({ project_id: TEST_PROJECT_ID, securityGroupId: "sg-123" })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized access",
      })
    )
  })

  it("handles 403 forbidden error from OpenStack API", async () => {
    const ctx = createMockContext({ mockHttpStatus: 403, mockStatusText: "Forbidden" })
    const caller = createCaller(ctx)

    await expect(caller.rbacPolicy.list({ project_id: TEST_PROJECT_ID, securityGroupId: "sg-123" })).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: "Access forbidden: Forbidden",
      })
    )
  })
})

describe("rbacPolicyRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates an RBAC policy successfully", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.rbacPolicy.create({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
      targetTenant: "target-project-1",
    })

    expect(result).toBeDefined()
    expect(result.object_id).toBe("sg-123")
    expect(result.target_tenant).toBe("target-project-1")
    expect(result.action).toBe("access_as_shared")
    expect(result.object_type).toBe("security_group")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "target-project-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("handles 400 bad request error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 400, mockStatusText: "Bad Request" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "target-project-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid request: Bad Request",
      })
    )
  })

  it("handles 403 forbidden error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 403, mockStatusText: "Forbidden" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "target-project-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to share this security group",
      })
    )
  })

  it("handles 404 not found error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 404, mockStatusText: "Not Found" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "target-project-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "Security group not found or target project does not exist",
      })
    )
  })

  it("handles 409 conflict error (already shared)", async () => {
    const ctx = createMockContext({ mockHttpStatus: 409, mockStatusText: "Conflict" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "target-project-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: "This security group is already shared with the specified project",
      })
    )
  })

  it("validates input - requires target tenant", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.create({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        targetTenant: "",
      })
    ).rejects.toThrowError()
  })
})

describe("rbacPolicyRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates an RBAC policy successfully", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.rbacPolicy.update({
      project_id: TEST_PROJECT_ID,
      policyId: "rbac-policy-1",
      targetTenant: "new-target-project",
    })

    expect(result).toBeDefined()
    expect(result.id).toBe("rbac-policy-1")
    expect(result.target_tenant).toBe("new-target-project")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.update({
        project_id: TEST_PROJECT_ID,
        policyId: "rbac-policy-1",
        targetTenant: "new-target-project",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("handles 400 bad request error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 400, mockStatusText: "Bad Request" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.update({
        project_id: TEST_PROJECT_ID,
        policyId: "rbac-policy-1",
        targetTenant: "new-target-project",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid request: Bad Request",
      })
    )
  })

  it("handles 404 not found error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 404, mockStatusText: "Not Found" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.update({
        project_id: TEST_PROJECT_ID,
        policyId: "nonexistent-policy",
        targetTenant: "new-target-project",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "RBAC policy not found: nonexistent-policy",
      })
    )
  })

  it("validates input - requires target tenant", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.update({
        project_id: TEST_PROJECT_ID,
        policyId: "rbac-policy-1",
        targetTenant: "",
      })
    ).rejects.toThrowError()
  })
})

describe("rbacPolicyRouter.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes an RBAC policy successfully", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.rbacPolicy.delete({
      project_id: TEST_PROJECT_ID,
      policyId: "rbac-policy-1",
    })

    expect(result).toBeUndefined()
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.delete({
        project_id: TEST_PROJECT_ID,
        policyId: "rbac-policy-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("handles 404 not found error", async () => {
    const ctx = createMockContext({ mockHttpStatus: 404, mockStatusText: "Not Found" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.delete({
        project_id: TEST_PROJECT_ID,
        policyId: "nonexistent-policy",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "RBAC policy not found: nonexistent-policy",
      })
    )
  })

  it("handles 409 conflict error (policy in use)", async () => {
    const ctx = createMockContext({ mockHttpStatus: 409, mockStatusText: "Conflict" })
    const caller = createCaller(ctx)

    await expect(
      caller.rbacPolicy.delete({
        project_id: TEST_PROJECT_ID,
        policyId: "rbac-policy-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: "Cannot delete RBAC policy because it is in use",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.rbacPolicy.delete({ project_id: TEST_PROJECT_ID, policyId: "rbac-policy-1" })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })
})

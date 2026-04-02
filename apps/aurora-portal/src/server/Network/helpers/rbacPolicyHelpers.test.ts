import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { RBACPolicyErrorHandlers, parseRBACPolicyResponse, parseRBACPoliciesListResponse } from "./rbacPolicyHelpers"

describe("RBACPolicyErrorHandlers.list", () => {
  it("handles 401 Unauthorized", () => {
    const error = RBACPolicyErrorHandlers.list({ status: 401 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 403 Forbidden", () => {
    const error = RBACPolicyErrorHandlers.list({ status: 403, statusText: "Forbidden" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toContain("Access forbidden")
  })

  it("handles unknown error codes", () => {
    const error = RBACPolicyErrorHandlers.list({ status: 500, statusText: "Server error" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to list RBAC policies")
  })

  it("handles missing statusText", () => {
    const error = RBACPolicyErrorHandlers.list({ status: 500 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.message).toContain("Unknown error")
  })
})

describe("RBACPolicyErrorHandlers.create", () => {
  it("handles 400 Bad Request", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 400, statusText: "Invalid input" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toContain("Invalid request")
  })

  it("handles 401 Unauthorized", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 401 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 403 Forbidden", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 403 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toContain("permission to share")
  })

  it("handles 404 Not Found", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 404 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toContain("Security group not found")
    expect(error.message).toContain("target project")
  })

  it("handles 409 Conflict (already shared)", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 409 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("already shared")
  })

  it("handles unknown error codes", () => {
    const error = RBACPolicyErrorHandlers.create({ status: 500, statusText: "Server error" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to create RBAC policy")
  })
})

describe("RBACPolicyErrorHandlers.update", () => {
  it("handles 400 Bad Request", () => {
    const error = RBACPolicyErrorHandlers.update({ status: 400, statusText: "Invalid input" }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toContain("Invalid request")
  })

  it("handles 401 Unauthorized", () => {
    const error = RBACPolicyErrorHandlers.update({ status: 401 }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 403 Forbidden", () => {
    const error = RBACPolicyErrorHandlers.update({ status: 403, statusText: "Forbidden" }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toContain("Access forbidden")
  })

  it("handles 404 Not Found with policy ID", () => {
    const error = RBACPolicyErrorHandlers.update({ status: 404 }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toContain("policy-123")
  })

  it("handles unknown error codes", () => {
    const error = RBACPolicyErrorHandlers.update({ status: 500, statusText: "Server error" }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to update RBAC policy")
  })
})

describe("RBACPolicyErrorHandlers.delete", () => {
  it("handles 401 Unauthorized", () => {
    const error = RBACPolicyErrorHandlers.delete({ status: 401 }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 404 Not Found with policy ID", () => {
    const error = RBACPolicyErrorHandlers.delete({ status: 404 }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toContain("policy-123")
  })

  it("handles 409 Conflict (in use)", () => {
    const error = RBACPolicyErrorHandlers.delete({ status: 409 }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("in use")
  })

  it("handles unknown error codes", () => {
    const error = RBACPolicyErrorHandlers.delete({ status: 500, statusText: "Server error" }, "policy-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to delete RBAC policy")
  })
})

describe("parseRBACPolicyResponse", () => {
  it("parses valid RBAC policy response", () => {
    const mockResponse = {
      rbac_policy: {
        id: "policy-123",
        object_type: "security_group",
        object_id: "sg-123",
        action: "access_as_shared",
        target_tenant: "project-456",
        tenant_id: "project-789",
        project_id: "project-789",
      },
    }

    const result = parseRBACPolicyResponse(mockResponse, "test operation")

    expect(result.id).toBe("policy-123")
    expect(result.object_type).toBe("security_group")
    expect(result.object_id).toBe("sg-123")
    expect(result.action).toBe("access_as_shared")
    expect(result.target_tenant).toBe("project-456")
  })

  it("parses RBAC policy without optional fields", () => {
    const mockResponse = {
      rbac_policy: {
        id: "policy-123",
        object_type: "network",
        object_id: "net-123",
        action: "access_as_external",
        target_tenant: "project-456",
      },
    }

    const result = parseRBACPolicyResponse(mockResponse, "test operation")

    expect(result.id).toBe("policy-123")
    expect(result.object_type).toBe("network")
    expect(result.action).toBe("access_as_external")
  })

  it("throws TRPCError on invalid response structure", () => {
    const mockResponse = {
      rbac_policy: {
        // Missing required fields
        id: "policy-123",
      },
    }

    expect(() => {
      parseRBACPolicyResponse(mockResponse, "test operation")
    }).toThrow(TRPCError)
  })

  it("throws TRPCError with operation context on parsing failure", () => {
    const mockResponse = { invalid: "structure" }

    try {
      parseRBACPolicyResponse(mockResponse, "test operation")
      throw new Error("Expected TRPCError to be thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError)
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        expect(error.message).toContain("Failed to parse")
      }
    }
  })

  it("validates object_type enum", () => {
    const mockResponse = {
      rbac_policy: {
        id: "policy-123",
        object_type: "invalid_type",
        object_id: "sg-123",
        action: "access_as_shared",
        target_tenant: "project-456",
      },
    }

    expect(() => {
      parseRBACPolicyResponse(mockResponse, "test operation")
    }).toThrow(TRPCError)
  })

  it("validates action enum", () => {
    const mockResponse = {
      rbac_policy: {
        id: "policy-123",
        object_type: "security_group",
        object_id: "sg-123",
        action: "invalid_action",
        target_tenant: "project-456",
      },
    }

    expect(() => {
      parseRBACPolicyResponse(mockResponse, "test operation")
    }).toThrow(TRPCError)
  })
})

describe("parseRBACPoliciesListResponse", () => {
  it("parses valid RBAC policies list response", () => {
    const mockResponse = {
      rbac_policies: [
        {
          id: "policy-1",
          object_type: "security_group",
          object_id: "sg-123",
          action: "access_as_shared",
          target_tenant: "project-1",
        },
        {
          id: "policy-2",
          object_type: "network",
          object_id: "net-456",
          action: "access_as_external",
          target_tenant: "project-2",
        },
      ],
    }

    const result = parseRBACPoliciesListResponse(mockResponse, "test operation")

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe("policy-1")
    expect(result[1].id).toBe("policy-2")
  })

  it("parses empty RBAC policies list", () => {
    const mockResponse = {
      rbac_policies: [],
    }

    const result = parseRBACPoliciesListResponse(mockResponse, "test operation")

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it("throws TRPCError on invalid response structure", () => {
    const mockResponse = {
      invalid: "structure",
    }

    expect(() => {
      parseRBACPoliciesListResponse(mockResponse, "test operation")
    }).toThrow(TRPCError)
  })

  it("throws TRPCError when list contains invalid policy", () => {
    const mockResponse = {
      rbac_policies: [
        {
          id: "policy-1",
          object_type: "security_group",
          object_id: "sg-123",
          action: "access_as_shared",
          target_tenant: "project-1",
        },
        {
          // Invalid: missing required fields
          id: "policy-2",
        },
      ],
    }

    expect(() => {
      parseRBACPoliciesListResponse(mockResponse, "test operation")
    }).toThrow(TRPCError)
  })
})

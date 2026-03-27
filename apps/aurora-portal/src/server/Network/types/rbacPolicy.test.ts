import { describe, it, expect } from "vitest"
import {
  rbacPolicySchema,
  rbacPoliciesResponseSchema,
  rbacPolicyResponseSchema,
  listRBACPoliciesForSecurityGroupInputSchema,
  createRBACPolicyInputSchema,
  updateRBACPolicyInputSchema,
  deleteRBACPolicyInputSchema,
} from "./rbacPolicy"

describe("rbacPolicySchema", () => {
  it("validates a complete RBAC policy", () => {
    const validPolicy = {
      id: "rbac-policy-123",
      object_type: "security_group",
      object_id: "sg-456",
      action: "access_as_shared",
      target_tenant: "project-789",
      tenant_id: "owner-project-123",
      project_id: "owner-project-123",
    }

    const result = rbacPolicySchema.safeParse(validPolicy)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("rbac-policy-123")
      expect(result.data.object_type).toBe("security_group")
      expect(result.data.action).toBe("access_as_shared")
    }
  })

  it("validates RBAC policy without optional fields", () => {
    const minimalPolicy = {
      id: "rbac-policy-123",
      object_type: "network",
      object_id: "net-456",
      action: "access_as_external",
      target_tenant: "project-789",
    }

    const result = rbacPolicySchema.safeParse(minimalPolicy)

    expect(result.success).toBe(true)
  })

  it("validates all object_type enum values", () => {
    const validTypes = ["qos_policy", "network", "security_group"]

    validTypes.forEach((type) => {
      const policy = {
        id: "policy-123",
        object_type: type,
        object_id: "obj-123",
        action: "access_as_shared",
        target_tenant: "project-123",
      }

      const result = rbacPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })
  })

  it("rejects invalid object_type", () => {
    const invalidPolicy = {
      id: "policy-123",
      object_type: "invalid_type",
      object_id: "obj-123",
      action: "access_as_shared",
      target_tenant: "project-123",
    }

    const result = rbacPolicySchema.safeParse(invalidPolicy)

    expect(result.success).toBe(false)
  })

  it("validates all action enum values", () => {
    const validActions = ["access_as_shared", "access_as_external"]

    validActions.forEach((action) => {
      const policy = {
        id: "policy-123",
        object_type: "security_group",
        object_id: "obj-123",
        action: action,
        target_tenant: "project-123",
      }

      const result = rbacPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })
  })

  it("rejects invalid action", () => {
    const invalidPolicy = {
      id: "policy-123",
      object_type: "security_group",
      object_id: "obj-123",
      action: "invalid_action",
      target_tenant: "project-123",
    }

    const result = rbacPolicySchema.safeParse(invalidPolicy)

    expect(result.success).toBe(false)
  })

  it("requires all mandatory fields", () => {
    const incompletePolicy = {
      id: "policy-123",
      object_type: "security_group",
      // Missing object_id, action, target_tenant
    }

    const result = rbacPolicySchema.safeParse(incompletePolicy)

    expect(result.success).toBe(false)
  })
})

describe("rbacPoliciesResponseSchema", () => {
  it("validates a response with multiple RBAC policies", () => {
    const response = {
      rbac_policies: [
        {
          id: "policy-1",
          object_type: "security_group",
          object_id: "sg-1",
          action: "access_as_shared",
          target_tenant: "project-1",
        },
        {
          id: "policy-2",
          object_type: "network",
          object_id: "net-2",
          action: "access_as_external",
          target_tenant: "project-2",
        },
      ],
    }

    const result = rbacPoliciesResponseSchema.safeParse(response)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rbac_policies.length).toBe(2)
    }
  })

  it("validates an empty policies list", () => {
    const response = {
      rbac_policies: [],
    }

    const result = rbacPoliciesResponseSchema.safeParse(response)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rbac_policies.length).toBe(0)
    }
  })

  it("rejects response without rbac_policies key", () => {
    const response = {
      policies: [], // Wrong key
    }

    const result = rbacPoliciesResponseSchema.safeParse(response)

    expect(result.success).toBe(false)
  })
})

describe("rbacPolicyResponseSchema", () => {
  it("validates a single RBAC policy response", () => {
    const response = {
      rbac_policy: {
        id: "policy-123",
        object_type: "security_group",
        object_id: "sg-456",
        action: "access_as_shared",
        target_tenant: "project-789",
      },
    }

    const result = rbacPolicyResponseSchema.safeParse(response)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rbac_policy.id).toBe("policy-123")
    }
  })

  it("rejects response without rbac_policy key", () => {
    const response = {
      policy: { id: "123" }, // Wrong key
    }

    const result = rbacPolicyResponseSchema.safeParse(response)

    expect(result.success).toBe(false)
  })
})

describe("listRBACPoliciesForSecurityGroupInputSchema", () => {
  it("validates valid security group ID", () => {
    const input = {
      securityGroupId: "sg-123",
    }

    const result = listRBACPoliciesForSecurityGroupInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.securityGroupId).toBe("sg-123")
    }
  })

  it("requires securityGroupId field", () => {
    const input = {}

    const result = listRBACPoliciesForSecurityGroupInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe("createRBACPolicyInputSchema", () => {
  it("validates valid create input", () => {
    const input = {
      securityGroupId: "sg-123",
      targetTenant: "project-456",
    }

    const result = createRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.securityGroupId).toBe("sg-123")
      expect(result.data.targetTenant).toBe("project-456")
    }
  })

  it("requires securityGroupId field", () => {
    const input = {
      targetTenant: "project-456",
    }

    const result = createRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it("requires targetTenant field", () => {
    const input = {
      securityGroupId: "sg-123",
    }

    const result = createRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it("rejects empty targetTenant", () => {
    const input = {
      securityGroupId: "sg-123",
      targetTenant: "",
    }

    const result = createRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Target project ID is required")
    }
  })

  it("validates targetTenant with whitespace only", () => {
    const input = {
      securityGroupId: "sg-123",
      targetTenant: "   ",
    }

    const result = createRBACPolicyInputSchema.safeParse(input)

    // Zod .min(1) should reject whitespace-only strings after parsing
    expect(result.success).toBe(true) // Zod doesn't trim by default
  })
})

describe("updateRBACPolicyInputSchema", () => {
  it("validates valid update input", () => {
    const input = {
      policyId: "policy-123",
      targetTenant: "project-456",
    }

    const result = updateRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.policyId).toBe("policy-123")
      expect(result.data.targetTenant).toBe("project-456")
    }
  })

  it("requires policyId field", () => {
    const input = {
      targetTenant: "project-456",
    }

    const result = updateRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it("requires targetTenant field", () => {
    const input = {
      policyId: "policy-123",
    }

    const result = updateRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it("rejects empty targetTenant", () => {
    const input = {
      policyId: "policy-123",
      targetTenant: "",
    }

    const result = updateRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Target project ID is required")
    }
  })
})

describe("deleteRBACPolicyInputSchema", () => {
  it("validates valid delete input", () => {
    const input = {
      policyId: "policy-123",
    }

    const result = deleteRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.policyId).toBe("policy-123")
    }
  })

  it("requires policyId field", () => {
    const input = {}

    const result = deleteRBACPolicyInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it("accepts any string as policyId", () => {
    const testCases = ["policy-123", "abc-def-ghi", "12345"]

    testCases.forEach((policyId) => {
      const result = deleteRBACPolicyInputSchema.safeParse({ policyId })
      expect(result.success).toBe(true)
    })
  })
})

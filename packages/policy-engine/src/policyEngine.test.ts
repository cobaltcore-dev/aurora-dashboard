import { describe, it, expect, beforeEach, vi } from "vitest"
import { PolicyEngine, PolicyConfig, KeystoneTokenPayload } from "./policyEngine.js"

const mockPolicyConfig: PolicyConfig = {
  project_parent: "not null:%(target.project.parent_id)s",
  monsoon2_domain: "'monsoon2':%(target.scoped_domain_name)s",
  admin_required: " role:admin or is_admin:1",
  cloud_admin: "rule:admin_required and (is_admin_project:True or domain_id:ccadmin)",
  domain_admin: "rule:admin_required and not token.domain.id:null",
  project_admin: "rule:admin_required and not project_id:null",
  cloud_admin_or_support: "rule:cloud_admin or role:cloud_support_tools_viewer",
  cloud_admin_or_support_or_dns_ops: "rule:cloud_admin or role:cloud_support_tools_viewer or role:cloud_dns_ops",
  cloud_support: "role:cloud_support_tools_viewer",
  _default: "rule:admin_required",
  service_role: "role:service",
  service_or_admin: "rule:admin_required or rule:service_role",
  owner: "user_id:%(user_id)s",
  admin_or_owner: "rule:admin_required or rule:owner",
  token_subject: "user_id:%(target.token.user_id)s",
  admin_or_token_subject: "rule:admin_required or rule:token_subject",
  can_write: "not domain_name:'monsoon2'",
}

const mockTokenPayload: KeystoneTokenPayload = {
  audit_ids: ["3T2dc1CGQxyJsHdDu1xkcw"],
  expires_at: "2015-11-07T02:58:43.578887Z",
  issued_at: "2015-11-07T01:58:43.578929Z",
  project: {
    domain: {
      id: "default",
      name: "Default",
    },
    id: "a6944d763bf64ee6a275f1263fae0352",
    name: "admin",
  },
  roles: [
    {
      id: "51cc68287d524c759f47c811e6463340",
      name: "admin",
    },
  ],
  user: {
    domain: {
      id: "default",
      name: "Default",
    },
    id: "ee4dfb6e5540447cb3741905149d9b6e",
    name: "admin",
    password_expires_at: "2016-11-06T15:32:17.000000",
  },
}

describe("PolicyEngine", () => {
  describe("constructor", () => {
    it("creates an instance with valid config", () => {
      const engine = new PolicyEngine(mockPolicyConfig)
      expect(engine).toBeInstanceOf(PolicyEngine)
    })

    it("throws error with invalid config", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new PolicyEngine(null as any)).toThrow(
        "(Policy configuration) Invalid input: expected record, received null"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new PolicyEngine(undefined as any)).toThrow(
        "(Policy configuration) Invalid input: expected record, received undefined"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new PolicyEngine("invalid" as any)).toThrow(
        "(Policy configuration) Invalid input: expected record, received string"
      )
    })

    it("throws error with empty config", () => {
      expect(() => new PolicyEngine({})).toThrow()
    })

    it.skip("throws error when rule compilation fails", () => {
      const invalidConfig = {
        invalidRule: "invalid syntax @#$%",
      }
      expect(() => new PolicyEngine(invalidConfig)).toThrow(/Failed to compile rule 'invalidRule'/)
    })
  })

  describe("properties", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("exposes policyConfig", () => {
      expect(engine.policyConfig).toEqual(mockPolicyConfig)
    })

    it("exposes configRules", () => {
      const expectedRules = Object.keys(mockPolicyConfig)
      expect(engine.configRules).toEqual(expectedRules)
    })
  })

  describe("policy method", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("is a function", () => {
      expect(typeof engine.policy).toEqual("function")
    })

    it("returns a UserPolicy object", () => {
      const userPolicy = engine.policy(mockTokenPayload)
      expect(typeof userPolicy).toEqual("object")
      expect(typeof userPolicy.check).toEqual("function")
      expect(typeof userPolicy.getRequiredParameters).toEqual("function")
      expect(typeof userPolicy.checkRequiredParameters).toEqual("function")
      expect(typeof userPolicy.validateParameters).toEqual("function")
      expect(userPolicy.tokenPayload).toEqual(mockTokenPayload)
    })

    it("validates token payload", () => {
      expect(() => engine.policy(null)).toThrow()
      expect(() => engine.policy({})).not.toThrow()
      expect(() => engine.policy({ invalid: "token" })).not.toThrow()
    })

    it("validates options", () => {
      expect(() => engine.policy(mockTokenPayload, { debug: true })).not.toThrow()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => engine.policy(mockTokenPayload, { debug: "invalid" } as any)).toThrow()
    })
  })

  describe("rule metadata", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("getRuleMetadata returns rule info for existing rule", () => {
      const metadata = engine.getRuleMetadata("owner")
      expect(metadata).toBeDefined()
      expect(metadata?.requiredParams).toContain("user_id")
      expect(Array.isArray(metadata?.usedRules)).toBe(true)
    })

    it("getRuleMetadata returns null for non-existing rule", () => {
      const metadata = engine.getRuleMetadata("non_existent")
      expect(metadata).toBeNull()
    })

    it("getRequiredParameters returns parameters for simple rule", () => {
      const params = engine.getRequiredParameters("owner")
      expect(params).toContain("user_id")
    })

    it("getRequiredParameters returns parameters for nested rules", () => {
      const params = engine.getRequiredParameters("admin_or_owner")
      expect(params).toContain("user_id") // from nested owner rule
    })

    it("getRequiredParameters handles circular references", () => {
      const circularConfig = {
        rule_a: "rule:rule_b",
        rule_b: "rule:rule_a",
      }
      const circularEngine = new PolicyEngine(circularConfig)
      expect(() => circularEngine.getRequiredParameters("rule_a")).not.toThrow()
    })

    it("getRequiredParameters throws for missing rule without default", () => {
      const simpleConfig = { simple: "role:admin" }
      const simpleEngine = new PolicyEngine(simpleConfig)
      expect(() => simpleEngine.getRequiredParameters("missing")).toThrow()
    })

    it("getRulesSummary returns summary of all rules", () => {
      const summary = engine.getRulesSummary()
      expect(Object.keys(summary)).toEqual(engine.configRules)
      expect(summary.owner.requiredParams).toContain("user_id")
      expect(summary.admin_or_owner.requiredParams).toContain("user_id")
    })
  })

  describe("parameter validation", () => {
    let engine: PolicyEngine
    let policy: ReturnType<PolicyEngine["policy"]>

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
      policy = engine.policy(mockTokenPayload)
    })

    it("checkRequiredParameters validates correctly", () => {
      const result = policy.checkRequiredParameters("owner", { user_id: "123" })
      expect(result.isValid).toBe(true)
      expect(result.missingParams).toEqual([])
      expect(result.providedParams).toContain("user_id")
      expect(result.requiredParams).toContain("user_id")
    })

    it("checkRequiredParameters detects missing parameters", () => {
      const result = policy.checkRequiredParameters("owner", {})
      expect(result.isValid).toBe(false)
      expect(result.missingParams).toContain("user_id")
    })

    it("checkRequiredParameters detects extra parameters", () => {
      const result = policy.checkRequiredParameters("owner", {
        user_id: "123",
        extra_param: "value",
      })
      expect(result.extraParams).toContain("extra_param")
    })

    it("validateParameters throws on missing parameters", () => {
      expect(() => policy.validateParameters("owner", {})).toThrow(/Missing required parameters/)
    })

    it("validateParameters passes with correct parameters", () => {
      expect(() => policy.validateParameters("owner", { user_id: "123" })).not.toThrow()
    })
  })

  describe("policy checks", () => {
    let policy: ReturnType<PolicyEngine["policy"]>
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
      policy = engine.policy(mockTokenPayload)
    })

    describe("project_parent rule", () => {
      it("returns true when parent_id exists", () => {
        const result = policy.check("project_parent", {
          target: { project: { parent_id: "12345" } },
        })
        expect(result).toBe(true)
      })

      it("returns false when parent_id is null", () => {
        const result = policy.check("project_parent", {
          target: { project: { parent_id: null } },
        })
        expect(result).toBe(false)
      })

      it("returns false when parent_id is missing", () => {
        const result = policy.check("project_parent", {
          target: { project: {} },
        })
        expect(result).toBe(false)
      })
    })

    describe("monsoon2_domain rule", () => {
      it("returns true for monsoon2 domain", () => {
        const result = policy.check("monsoon2_domain", {
          target: { scoped_domain_name: "monsoon2" },
        })
        expect(result).toBe(true)
      })

      it("returns false for other domains", () => {
        const result = policy.check("monsoon2_domain", {
          target: { scoped_domain_name: "unknown" },
        })
        expect(result).toBe(false)
      })
    })

    describe("admin_required rule", () => {
      it("returns true for admin role", () => {
        const result = policy.check("admin_required")
        expect(result).toBe(true)
      })

      it("returns false for non-admin user", () => {
        const nonAdminPolicy = engine.policy({
          ...mockTokenPayload,
          roles: [{ id: "123", name: "user" }],
        })
        const result = nonAdminPolicy.check("admin_required")
        expect(result).toBe(false)
      })
    })

    describe("cloud_admin rule", () => {
      it("returns false for regular admin", () => {
        const result = policy.check("cloud_admin")
        expect(result).toBe(false)
      })

      it("returns true for admin with ccadmin domain", () => {
        const cloudAdminPolicy = engine.policy({
          ...mockTokenPayload,
          domain: { id: "ccadmin", name: "CCAdmin" },
        })
        const result = cloudAdminPolicy.check("cloud_admin")
        expect(result).toBe(true)
      })
    })

    describe("domain_admin rule", () => {
      it("returns false when domain is null", () => {
        const nodomainPolicy = engine.policy({
          ...mockTokenPayload,
          project: undefined,
          domain: undefined,
        })
        const result = nodomainPolicy.check("domain_admin")
        expect(result).toBe(false)
      })

      it("returns true for admin with domain", () => {
        const result = policy.check("domain_admin")
        expect(result).toBe(true)
      })
    })

    describe("project_admin rule", () => {
      it("returns true for admin with project", () => {
        const result = policy.check("project_admin")
        expect(result).toBe(true)
      })

      it("returns false for admin without project", () => {
        const noProjectPolicy = engine.policy({
          ...mockTokenPayload,
          project: undefined,
        })
        const result = noProjectPolicy.check("project_admin")
        expect(result).toBe(false)
      })
    })

    describe("service and support roles", () => {
      it("cloud_admin_or_support returns false for regular admin", () => {
        const result = policy.check("cloud_admin_or_support")
        expect(result).toBe(false)
      })

      it("cloud_admin_or_support_or_dns_ops returns false for regular admin", () => {
        const result = policy.check("cloud_admin_or_support_or_dns_ops")
        expect(result).toBe(false)
      })

      it("cloud_support returns false for admin role", () => {
        const result = policy.check("cloud_support")
        expect(result).toBe(false)
      })

      it("service_role returns false for admin role", () => {
        const result = policy.check("service_role")
        expect(result).toBe(false)
      })

      it("service_or_admin returns true for admin", () => {
        const result = policy.check("service_or_admin")
        expect(result).toBe(true)
      })
    })

    describe("owner and subject rules", () => {
      it("owner returns true for matching user_id", () => {
        const result = policy.check("owner", {
          user_id: "ee4dfb6e5540447cb3741905149d9b6e",
        })
        expect(result).toBe(true)
      })

      it("owner returns false for different user_id", () => {
        const result = policy.check("owner", {
          user_id: "12345",
        })
        expect(result).toBe(false)
      })

      it("admin_or_owner returns true for admin", () => {
        const result = policy.check("admin_or_owner")
        expect(result).toBe(true)
      })

      it("token_subject returns true for matching target user", () => {
        const result = policy.check("token_subject", {
          target: { token: { user_id: "ee4dfb6e5540447cb3741905149d9b6e" } },
        })
        expect(result).toBe(true)
      })

      it("token_subject returns false without target", () => {
        const result = policy.check("token_subject")
        expect(result).toBe(false)
      })

      it("admin_or_token_subject returns true for admin", () => {
        const result = policy.check("admin_or_token_subject")
        expect(result).toBe(true)
      })
    })

    describe("can_write rule", () => {
      it("returns true for non-monsoon2 domain", () => {
        const result = policy.check("can_write")
        expect(result).toBe(true)
      })

      it("returns false for monsoon2 domain", () => {
        const monsoonPolicy = engine.policy({
          ...mockTokenPayload,
          domain: { id: "monsoon2", name: "monsoon2" },
        })
        const result = monsoonPolicy.check("can_write")
        expect(result).toBe(false)
      })
    })

    describe("default rule fallback", () => {
      it("uses _default rule for unknown rule names", () => {
        const result = policy.check("unknown_rule")
        expect(result).toBe(true) // Should use admin_required via _default
      })
    })
  })

  describe("policy options", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("handles strictParameterValidation option", () => {
      const strictPolicy = engine.policy(mockTokenPayload, {
        strictParameterValidation: true,
      })

      expect(() => strictPolicy.check("owner")).toThrow(/Missing required parameters/)
      expect(() => strictPolicy.check("owner", { user_id: "123" })).not.toThrow()
    })

    it("handles defaultParams option", () => {
      const policyWithDefaults = engine.policy(mockTokenPayload, {
        defaultParams: { user_id: "default_user" },
      })

      const result = policyWithDefaults.check("owner")
      expect(result).toBe(false) // default_user !== actual user
    })

    it("merges provided params with defaultParams", () => {
      const policyWithDefaults = engine.policy(mockTokenPayload, {
        defaultParams: {
          user_id: "default_user",
          extra_param: "default_value",
        },
      })

      // Provided params should override defaults
      const result = policyWithDefaults.check("owner", {
        user_id: "ee4dfb6e5540447cb3741905149d9b6e",
      })
      expect(result).toBe(true)
    })
  })

  describe("debug functionality", () => {
    let engine: PolicyEngine
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it("enables debug mode", () => {
      const debugPolicy = engine.policy(mockTokenPayload, { debug: true })
      debugPolicy.check("admin_required")
      expect(consoleSpy).toHaveBeenCalled()
    })

    it("does not log in non-debug mode", () => {
      const regularPolicy = engine.policy(mockTokenPayload, { debug: false })
      regularPolicy.check("admin_required")
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it("handles debugDetails option", () => {
      const debugPolicy = engine.policy(mockTokenPayload, {
        debug: true,
        debugDetails: true,
      })
      debugPolicy.check("admin_required")
      expect(consoleSpy).toHaveBeenCalled()
    })

    it("logs parameter analysis in debug mode", () => {
      const debugPolicy = engine.policy(mockTokenPayload, { debug: true })
      debugPolicy.check("owner", { user_id: "123" })

      const logCalls = consoleSpy.mock.calls.flat()
      const hasParameterInfo = logCalls.some((call) => typeof call === "string" && call.includes("Required parameters"))
      expect(hasParameterInfo).toBe(true)
    })

    it("logs rule evaluation trace", () => {
      const debugPolicy = engine.policy(mockTokenPayload, { debug: true })
      debugPolicy.check("admin_or_owner")

      const logCalls = consoleSpy.mock.calls.flat()
      const hasRuleTrace = logCalls.some((call) => typeof call === "string" && call.includes("Starting policy check"))
      expect(hasRuleTrace).toBe(true)
    })
  })

  describe("error handling", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("throws error for missing rule without default", () => {
      const simpleConfig = { simple: "role:admin" }
      const simpleEngine = new PolicyEngine(simpleConfig)
      const simplePolicy = simpleEngine.policy(mockTokenPayload)

      expect(() => simplePolicy.check("missing_rule")).toThrow(
        /Rule 'missing_rule' not found and no _default rule available/
      )
    })

    it("handles evaluation errors gracefully", () => {
      const policy = engine.policy(mockTokenPayload)

      // This should not throw, but might return false or use default behavior
      expect(() => policy.check("project_parent")).not.toThrow()
    })
  })

  describe("complex scenarios", () => {
    let engine: PolicyEngine

    beforeEach(() => {
      engine = new PolicyEngine(mockPolicyConfig)
    })

    it("handles deeply nested rule references", () => {
      const policy = engine.policy(mockTokenPayload)
      const result = policy.check("cloud_admin_or_support") // Includes admin_required -> cloud_admin
      expect(typeof result).toBe("boolean")
    })

    it("handles multiple parameter dependencies", () => {
      const policy = engine.policy(mockTokenPayload)
      const result = policy.check("token_subject", {
        target: { token: { user_id: mockTokenPayload.user?.id } },
      })
      expect(result).toBe(true)
    })

    it("works with different token payload structures", () => {
      const minimalToken = { user: { id: "123", name: "test", domain: { id: "default", name: "Default" } } }
      const policy = engine.policy(minimalToken)
      expect(() => policy.check("admin_required")).not.toThrow()
    })

    it("handles admin detection from different sources", () => {
      // Test is_admin flag
      const adminByFlag = engine.policy({ ...mockTokenPayload, is_admin: true })
      expect(adminByFlag.check("admin_required")).toBe(true)

      // Test admin role
      const adminByRole = engine.policy({
        ...mockTokenPayload,
        roles: [{ id: "1", name: "admin" }],
      })
      expect(adminByRole.check("admin_required")).toBe(true)
    })
  })
})

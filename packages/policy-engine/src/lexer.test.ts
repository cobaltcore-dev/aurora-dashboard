import { describe, it, expect } from "vitest"
// Assuming your lexer function is exported as 'lexer'
import { tokenize } from "./lexer"

describe("Keystone Policy Lexer", () => {
  // Basic Expression Tests
  describe("Basic Expressions", () => {
    it("should parse simple role expression", () => {
      const result = tokenize("role:admin")
      expect(result).toEqual([{ type: "expression", value: "role:admin" }])
    })

    it("should parse rule reference", () => {
      const result = tokenize("rule:admin_required")
      expect(result).toEqual([{ type: "expression", value: "rule:admin_required" }])
    })

    it("should parse user_id with placeholder", () => {
      const result = tokenize("user_id:%(user_id)s")
      expect(result).toEqual([{ type: "expression", value: "user_id:%(user_id)s" }])
    })

    it("should parse system_scope expression", () => {
      const result = tokenize("system_scope:all")
      expect(result).toEqual([{ type: "expression", value: "system_scope:all" }])
    })

    it("should parse boolean values", () => {
      const result = tokenize("is_admin_project:True")
      expect(result).toEqual([{ type: "expression", value: "is_admin_project:True" }])
    })

    it("should parse None values", () => {
      const result = tokenize("None:%(target.role.domain_id)s")
      expect(result).toEqual([{ type: "expression", value: "None:%(target.role.domain_id)s" }])
    })
  })

  // Quoted Values Tests
  describe("Quoted Values", () => {
    it("should parse single-quoted values", () => {
      const result = tokenize("domain_id:'ccadmin'")
      expect(result).toEqual([{ type: "expression", value: "domain_id:'ccadmin'" }])
    })

    it("should parse double-quoted values", () => {
      const result = tokenize('project_id:"test-project"')
      expect(result).toEqual([{ type: "expression", value: 'project_id:"test-project"' }])
    })

    it("should handle quotes within expressions", () => {
      const result = tokenize("'resource_service':%(target.role.name)s")
      expect(result).toEqual([{ type: "expression", value: "'resource_service':%(target.role.name)s" }])
    })
  })

  // Operator Tests
  describe("Operators", () => {
    it("should parse AND operator", () => {
      const result = tokenize("role:admin and role:user")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "expression", value: "role:user" },
      ])
    })

    it("should parse OR operator", () => {
      const result = tokenize("role:admin or role:user")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "or" },
        { type: "expression", value: "role:user" },
      ])
    })

    it("should parse NOT operator", () => {
      const result = tokenize("not role:admin")
      expect(result).toEqual([
        { type: "operator", value: "not" },
        { type: "expression", value: "role:admin" },
      ])
    })

    it("should handle multiple operators", () => {
      const result = tokenize("role:admin and not role:user")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "operator", value: "not" },
        { type: "expression", value: "role:user" },
      ])
    })
  })

  // Parentheses Tests
  describe("Parentheses", () => {
    it("should parse simple parentheses", () => {
      const result = tokenize("(role:admin)")
      expect(result).toEqual([
        { type: "operator", value: "(" },
        { type: "expression", value: "role:admin" },
        { type: "operator", value: ")" },
      ])
    })

    it("should parse nested parentheses", () => {
      const result = tokenize("((role:admin))")
      expect(result).toEqual([
        { type: "operator", value: "(" },
        { type: "operator", value: "(" },
        { type: "expression", value: "role:admin" },
        { type: "operator", value: ")" },
        { type: "operator", value: ")" },
      ])
    })

    it("should parse complex expression with parentheses", () => {
      const result = tokenize("rule:admin_required and (is_admin_project:True or domain_id:default)")
      expect(result).toEqual([
        { type: "expression", value: "rule:admin_required" },
        { type: "operator", value: "and" },
        { type: "operator", value: "(" },
        { type: "expression", value: "is_admin_project:True" },
        { type: "operator", value: "or" },
        { type: "expression", value: "domain_id:default" },
        { type: "operator", value: ")" },
      ])
    })
  })

  // Complex Expressions from Real Rules
  describe("Real Keystone Rules", () => {
    it("should parse cloud_admin rule", () => {
      const rule =
        "(role:admin and system_scope:all) or (role:admin and ((is_admin_project:True or domain_id:default)))"
      const result = tokenize(rule)
      expect(result).toEqual([
        { type: "operator", value: "(" },
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "expression", value: "system_scope:all" },
        { type: "operator", value: ")" },
        { type: "operator", value: "or" },
        { type: "operator", value: "(" },
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "operator", value: "(" },
        { type: "operator", value: "(" },
        { type: "expression", value: "is_admin_project:True" },
        { type: "operator", value: "or" },
        { type: "expression", value: "domain_id:default" },
        { type: "operator", value: ")" },
        { type: "operator", value: ")" },
        { type: "operator", value: ")" },
      ])
    })

    it("should parse domain_admin_grant_match rule", () => {
      const rule = "domain_id:%(domain_id)s or domain_id:%(target.project.domain_id)s"
      const result = tokenize(rule)
      expect(result).toEqual([
        { type: "expression", value: "domain_id:%(domain_id)s" },
        { type: "operator", value: "or" },
        { type: "expression", value: "domain_id:%(target.project.domain_id)s" },
      ])
    })

    it("should parse complex blocklist_roles rule", () => {
      const rule = "'resource_service':%(target.role.name)s or 'cloud_registry_admin':%(target.role.name)s"
      const result = tokenize(rule)
      expect(result).toEqual([
        { type: "expression", value: "'resource_service':%(target.role.name)s" },
        { type: "operator", value: "or" },
        { type: "expression", value: "'cloud_registry_admin':%(target.role.name)s" },
      ])
    })
  })

  // Whitespace Handling Tests
  describe("Whitespace Handling", () => {
    it("should handle multiple spaces", () => {
      const result = tokenize("role:admin    and    role:user")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "expression", value: "role:user" },
      ])
    })

    it("should handle tabs and newlines", () => {
      const result = tokenize("role:admin\n\tand\n\trole:user")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "expression", value: "role:user" },
      ])
    })

    it("should handle no spaces around operators", () => {
      const result = tokenize("role:admin and(role:user or role:viewer)")
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "and" },
        { type: "operator", value: "(" },
        { type: "expression", value: "role:user" },
        { type: "operator", value: "or" },
        { type: "expression", value: "role:viewer" },
        { type: "operator", value: ")" },
      ])
    })
  })

  // Edge Cases and Error Handling
  describe("Edge Cases", () => {
    it("should handle empty string", () => {
      const result = tokenize("")
      expect(result).toEqual([])
    })

    it("should handle whitespace-only string", () => {
      const result = tokenize("   \n\t   ")
      expect(result).toEqual([])
    })

    it("should handle single operator", () => {
      const result = tokenize("and")
      expect(result).toEqual([{ type: "operator", value: "and" }])
    })

    it("should handle single parenthesis", () => {
      const result = tokenize("(")
      expect(result).toEqual([{ type: "operator", value: "(" }])
    })

    it("should handle unmatched quotes in expressions", () => {
      const result = tokenize("domain_id:'unclosed")
      expect(result).toEqual([{ type: "expression", value: "domain_id:'unclosed" }])
    })

    it("should handle special characters in values", () => {
      const result = tokenize("project_id:test-project_123")
      expect(result).toEqual([{ type: "expression", value: "project_id:test-project_123" }])
    })

    it("should handle colons in expressions without values", () => {
      const result = tokenize("role:")
      expect(result).toEqual([{ type: "expression", value: "role:" }])
    })
  })

  // Placeholder Pattern Tests
  describe("Placeholder Patterns", () => {
    it("should handle simple placeholders", () => {
      const result = tokenize("user_id:%(user_id)s")
      expect(result).toEqual([{ type: "expression", value: "user_id:%(user_id)s" }])
    })

    it("should handle nested placeholders", () => {
      const result = tokenize("user_id:%(target.token.user_id)s")
      expect(result).toEqual([{ type: "expression", value: "user_id:%(target.token.user_id)s" }])
    })

    it("should handle multiple placeholders in one rule", () => {
      const result = tokenize("user_id:%(user_id)s and project_id:%(target.project.id)s")
      expect(result).toEqual([
        { type: "expression", value: "user_id:%(user_id)s" },
        { type: "operator", value: "and" },
        { type: "expression", value: "project_id:%(target.project.id)s" },
      ])
    })
  })

  // Case Sensitivity Tests
  describe("Case Sensitivity", () => {
    it("should handle uppercase operators", () => {
      const result = tokenize("role:admin AND role:user")
      // Assuming your lexer handles case-insensitive operators
      expect(result).toEqual([
        { type: "expression", value: "role:admin" },
        { type: "operator", value: "AND" }, // or 'and' if normalized
        { type: "expression", value: "role:user" },
      ])
    })

    it("should preserve case in expressions", () => {
      const result = tokenize("Role:Admin")
      expect(result).toEqual([{ type: "expression", value: "Role:Admin" }])
    })
  })

  // Performance Tests
  describe("Performance", () => {
    it("should handle very long rules", () => {
      const longRule = Array(100).fill("role:admin").join(" or ")
      const result = tokenize(longRule)
      expect(result).toHaveLength(199) // 100 expressions + 99 operators
    })

    it("should handle deeply nested parentheses", () => {
      const nested = "(".repeat(10) + "role:admin" + ")".repeat(10)
      const result = tokenize(nested)
      expect(result).toHaveLength(21) // 10 open + 1 expression + 10 close
    })
  })

  // Real-world Complex Examples
  describe("Complex Real Examples", () => {
    it("should parse the provided example correctly", () => {
      const rule =
        "rule:admin_required and (is_admin_project:True or domain_id:'ccadmin' or user_id:%(user_id)s) and not user_id:D064310"
      const result = tokenize(rule)
      expect(result).toEqual([
        { type: "expression", value: "rule:admin_required" },
        { type: "operator", value: "and" },
        { type: "operator", value: "(" },
        { type: "expression", value: "is_admin_project:True" },
        { type: "operator", value: "or" },
        { type: "expression", value: "domain_id:'ccadmin'" },
        { type: "operator", value: "or" },
        { type: "expression", value: "user_id:%(user_id)s" },
        { type: "operator", value: ")" },
        { type: "operator", value: "and" },
        { type: "operator", value: "not" },
        { type: "expression", value: "user_id:D064310" },
      ])
    })

    it("should parse identity:get_domain rule", () => {
      const rule =
        "rule:cloud_reader or token.domain.id:%(target.domain.id)s or token.project.domain.id:%(target.domain.id)s or role:role_viewer"
      const result = tokenize(rule)
      expect(result).toEqual([
        { type: "expression", value: "rule:cloud_reader" },
        { type: "operator", value: "or" },
        { type: "expression", value: "token.domain.id:%(target.domain.id)s" },
        { type: "operator", value: "or" },
        { type: "expression", value: "token.project.domain.id:%(target.domain.id)s" },
        { type: "operator", value: "or" },
        { type: "expression", value: "role:role_viewer" },
      ])
    })
  })

  // Invalid Input Handling
  describe("Invalid Input Handling", () => {
    it("should handle null input", () => {
      expect(() => tokenize(null)).not.toThrow()
    })

    it("should handle undefined input", () => {
      expect(() => tokenize(undefined)).not.toThrow()
    })

    it("should handle non-string input", () => {
      expect(() => tokenize(123)).not.toThrow()
    })

    it("should handle objects as input", () => {
      expect(() => tokenize({})).not.toThrow()
    })
  })
})

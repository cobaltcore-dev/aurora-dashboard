import { describe, it, expect } from "vitest"
import {
  securityGroupRuleSchema,
  securityGroupSchema,
  securityGroupsResponseSchema,
  listSecurityGroupsInputSchema,
  createSecurityGroupRuleInputSchema,
} from "./securityGroup"

describe("OpenStack Security Group Schema Validation", () => {
  const minimalValidRule = { id: "rule-123" }

  const completeValidRule = {
    id: "rule-456",
    direction: "ingress",
    ethertype: "IPv4",
    description: "Allow SSH",
    security_group_id: "sg-1",
    protocol: "tcp",
    port_range_min: 22,
    port_range_max: 22,
    remote_ip_prefix: "10.0.0.0/24",
    remote_group_id: null,
    remote_address_group_id: null,
    tenant_id: "tenant-1",
    project_id: "project-1",
    revision_number: 1,
    tags: ["web"],
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T11:00:00Z",
  }

  const minimalValidSecurityGroup = { id: "sg-1" }

  const completeValidSecurityGroup = {
    id: "sg-2",
    name: "default",
    description: "Default security group",
    tenant_id: "tenant-1",
    project_id: "project-1",
    stateful: true,
    shared: false,
    tags: ["default"],
    security_group_rules: [minimalValidRule, completeValidRule],
    revision_number: 2,
    created_at: "2025-01-10T08:00:00Z",
    updated_at: "2025-01-15T12:00:00Z",
  }

  describe("securityGroupRuleSchema", () => {
    it("should validate a minimal valid rule (id only)", () => {
      expect(securityGroupRuleSchema.safeParse(minimalValidRule).success).toBe(true)
    })
    it("should validate a complete valid rule", () => {
      expect(securityGroupRuleSchema.safeParse(completeValidRule).success).toBe(true)
    })
    it("should reject a rule without id", () => {
      const result = securityGroupRuleSchema.safeParse({ direction: "ingress" })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toContain("id")
    })
    it("should validate null for optional nullable fields", () => {
      const rule = { ...minimalValidRule, description: null, protocol: null, updated_at: null }
      expect(securityGroupRuleSchema.safeParse(rule).success).toBe(true)
    })
    it("should validate direction enum (ingress | egress)", () => {
      expect(securityGroupRuleSchema.safeParse({ ...minimalValidRule, direction: "ingress" }).success).toBe(true)
      expect(securityGroupRuleSchema.safeParse({ ...minimalValidRule, direction: "egress" }).success).toBe(true)
    })
    it("should validate ethertype enum (IPv4 | IPv6)", () => {
      expect(securityGroupRuleSchema.safeParse({ ...minimalValidRule, ethertype: "IPv4" }).success).toBe(true)
      expect(securityGroupRuleSchema.safeParse({ ...minimalValidRule, ethertype: "IPv6" }).success).toBe(true)
    })
  })

  describe("securityGroupSchema", () => {
    it("should validate a minimal valid security group (id only)", () => {
      expect(securityGroupSchema.safeParse(minimalValidSecurityGroup).success).toBe(true)
    })
    it("should validate a complete valid security group with rules", () => {
      expect(securityGroupSchema.safeParse(completeValidSecurityGroup).success).toBe(true)
    })
    it("should reject a security group without id", () => {
      const result = securityGroupSchema.safeParse({ name: "default" })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toContain("id")
    })
    it("should validate null for optional string fields", () => {
      const sg = { ...minimalValidSecurityGroup, name: null, description: null, updated_at: null }
      expect(securityGroupSchema.safeParse(sg).success).toBe(true)
    })
    it("should validate security group with empty rules array", () => {
      expect(securityGroupSchema.safeParse({ ...minimalValidSecurityGroup, security_group_rules: [] }).success).toBe(
        true
      )
    })
  })

  describe("securityGroupsResponseSchema", () => {
    it("should validate list response with one security group", () => {
      expect(securityGroupsResponseSchema.safeParse({ security_groups: [minimalValidSecurityGroup] }).success).toBe(
        true
      )
    })
    it("should validate empty security_groups array", () => {
      expect(securityGroupsResponseSchema.safeParse({ security_groups: [] }).success).toBe(true)
    })
    it("should reject response without security_groups key", () => {
      expect(securityGroupsResponseSchema.safeParse({}).success).toBe(false)
    })
  })

  describe("listSecurityGroupsInputSchema", () => {
    it("should validate empty input (project_id is required)", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ project_id: "proj-1" }).success).toBe(true)
    })
    it("should validate full list input", () => {
      const input = {
        project_id: "proj-1",
        sort_key: "name",
        sort_dir: "asc",
        name: "web",
        shared: false,
      }
      expect(listSecurityGroupsInputSchema.safeParse(input).success).toBe(true)
    })
    it("should validate sort_dir only as asc or desc", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ project_id: "proj-1", sort_dir: "asc" }).success).toBe(true)
      expect(listSecurityGroupsInputSchema.safeParse({ project_id: "proj-1", sort_dir: "desc" }).success).toBe(true)
    })
    it("should reject invalid sort_dir", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ project_id: "proj-1", sort_dir: "invalid" }).success).toBe(false)
    })
  })

  describe("createSecurityGroupRuleInputSchema - Type checking", () => {
    const minimalValidInput = {
      security_group_id: "sg-123",
      direction: "ingress" as const,
    }

    it("should accept minimal valid input", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse(minimalValidInput)
      expect(result.success).toBe(true)
    })

    it("should accept complete valid input", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        ethertype: "IPv4",
        description: "Allow SSH",
        protocol: "tcp",
        port_range_min: 22,
        port_range_max: 22,
        remote_ip_prefix: "0.0.0.0/0",
      })
      expect(result.success).toBe(true)
    })

    it("should accept null for nullable fields", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        protocol: null,
        port_range_min: null,
        port_range_max: null,
        remote_ip_prefix: null,
        remote_group_id: null,
        remote_address_group_id: null,
      })
      expect(result.success).toBe(true)
    })

    it("should reject missing required field: security_group_id", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        direction: "ingress",
      })
      expect(result.success).toBe(false)
    })

    it("should reject missing required field: direction", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        security_group_id: "sg-123",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid direction value", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        direction: "invalid",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid ethertype value", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        ethertype: "invalid",
      })
      expect(result.success).toBe(false)
    })

    it("should apply default ethertype=IPv4", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse(minimalValidInput)
      if (result.success) {
        expect(result.data.ethertype).toBe("IPv4")
      }
    })

    it("should transform empty string to undefined for remote_ip_prefix", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        remote_ip_prefix: "",
      })
      if (result.success) {
        expect(result.data.remote_ip_prefix).toBeUndefined()
      }
    })

    it("should transform empty string to undefined for remote_group_id", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        remote_group_id: "",
      })
      if (result.success) {
        expect(result.data.remote_group_id).toBeUndefined()
      }
    })

    it("should accept port numbers as integers", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        protocol: "tcp",
        port_range_min: 80,
        port_range_max: 443,
      })
      expect(result.success).toBe(true)
    })

    it("should reject port_range_max > 65535", () => {
      const result = createSecurityGroupRuleInputSchema.safeParse({
        ...minimalValidInput,
        protocol: "tcp",
        port_range_min: 1,
        port_range_max: 65536,
      })
      expect(result.success).toBe(false)
    })
  })
})

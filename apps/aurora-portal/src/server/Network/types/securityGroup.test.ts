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
    it("should validate empty input (all optional)", () => {
      expect(listSecurityGroupsInputSchema.safeParse({}).success).toBe(true)
    })
    it("should validate full list input", () => {
      const input = { limit: 20, marker: "sg-id", sort_key: "name", sort_dir: "asc", name: "web", shared: false }
      expect(listSecurityGroupsInputSchema.safeParse(input).success).toBe(true)
    })
    it("should validate sort_dir only as asc or desc", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ sort_dir: "asc" }).success).toBe(true)
      expect(listSecurityGroupsInputSchema.safeParse({ sort_dir: "desc" }).success).toBe(true)
    })
    it("should reject invalid sort_dir", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ sort_dir: "invalid" }).success).toBe(false)
    })
    it("should validate limit within 1..1000", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ limit: 1 }).success).toBe(true)
      expect(listSecurityGroupsInputSchema.safeParse({ limit: 1000 }).success).toBe(true)
    })
    it("should reject limit less than 1", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ limit: 0 }).success).toBe(false)
    })
    it("should reject limit greater than 1000", () => {
      expect(listSecurityGroupsInputSchema.safeParse({ limit: 1001 }).success).toBe(false)
    })
  })

  describe("createSecurityGroupRuleInputSchema - CIDR validation", () => {
    const minimalValidInput = {
      security_group_id: "sg-123",
      direction: "ingress" as const,
    }

    describe("Valid IPv4 CIDR notations", () => {
      it("should accept valid IPv4 CIDR: 0.0.0.0/0", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "0.0.0.0/0",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv4 CIDR: 192.168.1.0/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168.1.0/24",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv4 CIDR: 10.0.0.1/32", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "10.0.0.1/32",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv4 CIDR: 172.16.0.0/12", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "172.16.0.0/12",
        })
        expect(result.success).toBe(true)
      })
    })

    describe("Invalid IPv4 CIDR notations", () => {
      it("should reject IPv4 with octets > 255: 999.999.999.999/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "999.999.999.999/24",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("valid CIDR notation")
        }
      })

      it("should reject IPv4 with prefix > 32: 192.168.1.0/99", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168.1.0/99",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("valid CIDR notation")
        }
      })

      it("should reject IPv4 with invalid octet: 256.1.1.1/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "256.1.1.1/24",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv4 with leading zeros: 192.168.001.1/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168.001.1/24",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv4 without prefix: 192.168.1.0", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168.1.0",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv4 with incomplete octets: 192.168/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168/24",
        })
        expect(result.success).toBe(false)
      })
    })

    describe("Valid IPv6 CIDR notations", () => {
      it("should accept valid IPv6 CIDR: ::/0", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "::/0",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv6 CIDR: 2001:db8::/32", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "2001:db8::/32",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv6 CIDR: fe80::/10", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "fe80::/10",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid full IPv6 CIDR: 2001:0db8:85a3:0000:0000:8a2e:0370:7334/128", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "2001:0db8:85a3:0000:0000:8a2e:0370:7334/128",
        })
        expect(result.success).toBe(true)
      })
    })

    describe("Invalid IPv6 CIDR notations", () => {
      it("should reject IPv6 with prefix > 128: ::/999", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "::/999",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("valid CIDR notation")
        }
      })

      it("should reject IPv6 with invalid hex: gggg::/64", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "gggg::/64",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv6 without prefix: 2001:db8::", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "2001:db8::",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv6 with too many segments: 2001:db8:0:0:0:0:0:0:0/64", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "2001:db8:0:0:0:0:0:0:0/64",
        })
        expect(result.success).toBe(false)
      })

      it("should reject IPv6 with multiple :: separators: 2001::db8::/32", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "2001::db8::/32",
        })
        expect(result.success).toBe(false)
      })
    })

    describe("Other CIDR validation rules", () => {
      it("should reject empty string", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "",
        })
        expect(result.success).toBe(true) // Empty string is transformed to undefined
      })

      it("should reject malformed CIDR: not-an-ip/24", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "not-an-ip/24",
        })
        expect(result.success).toBe(false)
      })

      it("should reject CIDR without slash: 192.168.1.0", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "192.168.1.0",
        })
        expect(result.success).toBe(false)
      })
    })
  })
})

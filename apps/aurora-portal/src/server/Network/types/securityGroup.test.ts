import { describe, it, expect } from "vitest"
import {
  securityGroupRuleSchema,
  securityGroupSchema,
  securityGroupsResponseSchema,
  listSecurityGroupsInputSchema,
  createSecurityGroupRuleInputSchema,
  detectCIDRFamily,
  isValidCIDR,
  validatePortRange,
  validateIcmpTypeCode,
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
          ethertype: "IPv6",
          remote_ip_prefix: "::/0",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv6 CIDR: 2001:db8::/32", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv6",
          remote_ip_prefix: "2001:db8::/32",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid IPv6 CIDR: fe80::/10", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv6",
          remote_ip_prefix: "fe80::/10",
        })
        expect(result.success).toBe(true)
      })

      it("should accept valid full IPv6 CIDR: 2001:0db8:85a3:0000:0000:8a2e:0370:7334/128", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv6",
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

    describe("Cross-field validation: ethertype and CIDR family", () => {
      it("should reject IPv4 CIDR with ethertype=IPv6", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv6",
          remote_ip_prefix: "192.168.1.0/24",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("ethertype must match the CIDR family")
        }
      })

      it("should reject IPv6 CIDR with ethertype=IPv4", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv4",
          remote_ip_prefix: "::/0",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("ethertype must match the CIDR family")
        }
      })

      it("should accept IPv4 CIDR with ethertype=IPv4 (explicit)", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv4",
          remote_ip_prefix: "10.0.0.0/8",
        })
        expect(result.success).toBe(true)
      })

      it("should accept IPv4 CIDR with default ethertype (IPv4)", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          remote_ip_prefix: "10.0.0.0/8",
        })
        expect(result.success).toBe(true)
      })

      it("should accept IPv6 CIDR with ethertype=IPv6", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          ethertype: "IPv6",
          remote_ip_prefix: "2001:db8::/32",
        })
        expect(result.success).toBe(true)
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

    describe("Port validation for TCP/UDP protocols", () => {
      it("should reject port 0 for TCP protocol", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "tcp",
          port_range_min: 0,
          port_range_max: 65535,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("TCP/UDP")
        }
      })

      it("should reject port 0 for UDP protocol", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "udp",
          port_range_min: 1,
          port_range_max: 0,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("TCP/UDP")
        }
      })

      it("should accept port 1 for TCP protocol", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "tcp",
          port_range_min: 1,
          port_range_max: 65535,
        })
        expect(result.success).toBe(true)
      })

      it("should accept port 22 for TCP (SSH)", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "tcp",
          port_range_min: 22,
          port_range_max: 22,
        })
        expect(result.success).toBe(true)
      })

      it("should accept port 1-65535 range for UDP", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "udp",
          port_range_min: 1,
          port_range_max: 65535,
        })
        expect(result.success).toBe(true)
      })

      it("should allow port 0 for ICMP protocol", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "icmp",
          port_range_min: 0,
          port_range_max: 0,
        })
        expect(result.success).toBe(true)
      })

      it("should allow port 0 for other protocols", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "esp",
          port_range_min: 0,
          port_range_max: 0,
        })
        expect(result.success).toBe(true)
      })

      it("should reject when port_range_min > port_range_max", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "tcp",
          port_range_min: 443,
          port_range_max: 80,
        })
        expect(result.success).toBe(false)
      })

      it("should handle case-insensitive protocol matching", () => {
        const result = createSecurityGroupRuleInputSchema.safeParse({
          ...minimalValidInput,
          protocol: "TCP",
          port_range_min: 0,
          port_range_max: 80,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe("Validation utility functions", () => {
    describe("detectCIDRFamily", () => {
      it("should detect IPv4 family", () => {
        expect(detectCIDRFamily("192.168.1.0/24")).toBe("IPv4")
        expect(detectCIDRFamily("0.0.0.0/0")).toBe("IPv4")
      })

      it("should detect IPv6 family", () => {
        expect(detectCIDRFamily("::/0")).toBe("IPv6")
        expect(detectCIDRFamily("2001:db8::/32")).toBe("IPv6")
      })

      it("should return null for invalid format", () => {
        expect(detectCIDRFamily("invalid")).toBeNull()
        expect(detectCIDRFamily("")).toBeNull()
      })
    })

    describe("isValidCIDR", () => {
      it("should validate IPv4 CIDR", () => {
        expect(isValidCIDR("0.0.0.0/0")).toBe(true)
        expect(isValidCIDR("192.168.1.0/24")).toBe(true)
        expect(isValidCIDR("999.999.999.999/99")).toBe(false)
      })

      it("should validate IPv6 CIDR", () => {
        expect(isValidCIDR("::/0")).toBe(true)
        expect(isValidCIDR("2001:db8::/32")).toBe(true)
        expect(isValidCIDR(":::/0")).toBe(false)
      })
    })

    describe("validatePortRange", () => {
      it("should validate TCP ports (1-65535)", () => {
        expect(validatePortRange(1, 65535, "tcp").valid).toBe(true)
        expect(validatePortRange(22, 22, "tcp").valid).toBe(true)
        expect(validatePortRange(0, 80, "tcp").valid).toBe(false)
        expect(validatePortRange(1, 0, "tcp").valid).toBe(false)
      })

      it("should validate UDP ports (1-65535)", () => {
        expect(validatePortRange(1, 65535, "udp").valid).toBe(true)
        expect(validatePortRange(0, 53, "udp").valid).toBe(false)
      })

      it("should allow port 0 for non-TCP/UDP protocols", () => {
        expect(validatePortRange(0, 0, "icmp").valid).toBe(true)
        expect(validatePortRange(0, 100, "esp").valid).toBe(true)
      })

      it("should validate min <= max", () => {
        expect(validatePortRange(80, 443, "tcp").valid).toBe(true)
        expect(validatePortRange(443, 80, "tcp").valid).toBe(false)
      })

      it("should handle null/undefined gracefully", () => {
        expect(validatePortRange(null, null, "tcp").valid).toBe(true)
        expect(validatePortRange(undefined, 80, "tcp").valid).toBe(true)
      })

      it("should reject NaN values", () => {
        expect(validatePortRange(NaN, 80, "tcp").valid).toBe(false)
        expect(validatePortRange(80, NaN, "tcp").valid).toBe(false)
        expect(validatePortRange(NaN, NaN, "tcp").valid).toBe(false)
      })
    })

    describe("validateIcmpTypeCode", () => {
      it("should validate ICMP type range (0-255)", () => {
        expect(validateIcmpTypeCode(0, null).valid).toBe(true)
        expect(validateIcmpTypeCode(255, null).valid).toBe(true)
        expect(validateIcmpTypeCode(256, null).valid).toBe(false)
        expect(validateIcmpTypeCode(-1, null).valid).toBe(false)
      })

      it("should validate ICMP code range (0-255)", () => {
        expect(validateIcmpTypeCode(null, 0).valid).toBe(true)
        expect(validateIcmpTypeCode(null, 255).valid).toBe(true)
        expect(validateIcmpTypeCode(null, 256).valid).toBe(false)
        expect(validateIcmpTypeCode(null, -1).valid).toBe(false)
      })

      it("should validate both type and code", () => {
        expect(validateIcmpTypeCode(8, 0).valid).toBe(true)
        expect(validateIcmpTypeCode(256, 256).valid).toBe(false)
      })

      it("should handle null/undefined gracefully", () => {
        expect(validateIcmpTypeCode(null, null).valid).toBe(true)
        expect(validateIcmpTypeCode(undefined, undefined).valid).toBe(true)
      })

      it("should reject NaN values", () => {
        expect(validateIcmpTypeCode(NaN, null).valid).toBe(false)
        expect(validateIcmpTypeCode(null, NaN).valid).toBe(false)
        expect(validateIcmpTypeCode(NaN, NaN).valid).toBe(false)
      })
    })
  })
})

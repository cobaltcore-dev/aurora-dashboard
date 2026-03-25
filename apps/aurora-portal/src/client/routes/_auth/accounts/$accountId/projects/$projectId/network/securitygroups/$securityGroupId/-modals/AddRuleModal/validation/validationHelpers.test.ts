import { describe, test, expect } from "vitest"
import { detectCIDRFamily, validatePortRange, validateIcmpTypeCode, isValidCIDR } from "./validationHelpers"

// ─── detectCIDRFamily Tests ───────────────────────────────────────────────────

describe("detectCIDRFamily", () => {
  describe("IPv4 detection", () => {
    test("detects IPv4 from standard CIDR", () => {
      expect(detectCIDRFamily("192.168.1.0/24")).toBe("IPv4")
    })

    test("detects IPv4 from 0.0.0.0/0", () => {
      expect(detectCIDRFamily("0.0.0.0/0")).toBe("IPv4")
    })

    test("detects IPv4 from single IP", () => {
      expect(detectCIDRFamily("10.0.0.1/32")).toBe("IPv4")
    })
  })

  describe("IPv6 detection", () => {
    test("detects IPv6 from standard CIDR", () => {
      expect(detectCIDRFamily("2001:db8::/32")).toBe("IPv6")
    })

    test("detects IPv6 from ::/0", () => {
      expect(detectCIDRFamily("::/0")).toBe("IPv6")
    })

    test("detects IPv6 from full address", () => {
      expect(detectCIDRFamily("fe80::1/64")).toBe("IPv6")
    })
  })

  describe("Invalid CIDR", () => {
    test("returns null for invalid format", () => {
      expect(detectCIDRFamily("invalid")).toBe(null)
    })

    test("returns null for empty string", () => {
      expect(detectCIDRFamily("")).toBe(null)
    })

    test("returns IPv4 for partial IPv4 address", () => {
      // detectCIDRFamily only checks for presence of "." or ":", not validity
      expect(detectCIDRFamily("192.168")).toBe("IPv4")
    })
  })
})

// ─── validatePortRange Tests ──────────────────────────────────────────────────

describe("validatePortRange", () => {
  describe("TCP/UDP validation", () => {
    test("accepts valid TCP port", () => {
      const result = validatePortRange(80, 80, "tcp")
      expect(result.valid).toBe(true)
    })

    test("accepts valid UDP port range", () => {
      const result = validatePortRange(1000, 2000, "udp")
      expect(result.valid).toBe(true)
    })

    test("rejects TCP port 0", () => {
      const result = validatePortRange(0, 0, "tcp")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("TCP/UDP")
    })

    test("rejects UDP port above 65535", () => {
      const result = validatePortRange(70000, 70000, "udp")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("TCP/UDP")
    })

    test("accepts port 1 for TCP", () => {
      const result = validatePortRange(1, 1, "tcp")
      expect(result.valid).toBe(true)
    })

    test("accepts port 65535 for UDP", () => {
      const result = validatePortRange(65535, 65535, "udp")
      expect(result.valid).toBe(true)
    })
  })

  describe("Other protocol validation", () => {
    test("accepts port 0 for non-TCP/UDP protocols", () => {
      const result = validatePortRange(0, 0, "icmp")
      expect(result.valid).toBe(true)
    })

    test("accepts valid range for other protocols", () => {
      const result = validatePortRange(0, 255, "gre")
      expect(result.valid).toBe(true)
    })

    test("rejects negative port", () => {
      const result = validatePortRange(-1, 100, "icmp")
      expect(result.valid).toBe(false)
    })

    test("rejects port above 65535", () => {
      const result = validatePortRange(70000, 70000, "esp")
      expect(result.valid).toBe(false)
    })
  })

  describe("Range validation", () => {
    test("accepts equal min and max", () => {
      const result = validatePortRange(8080, 8080, "tcp")
      expect(result.valid).toBe(true)
    })

    test("rejects min > max", () => {
      const result = validatePortRange(9090, 8080, "tcp")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("less than or equal to")
    })

    test("accepts min < max", () => {
      const result = validatePortRange(8080, 9090, "tcp")
      expect(result.valid).toBe(true)
    })
  })

  describe("NaN handling", () => {
    test("rejects NaN for portMin", () => {
      const result = validatePortRange(NaN, 80, "tcp")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("valid number")
    })

    test("rejects NaN for portMax", () => {
      const result = validatePortRange(80, NaN, "tcp")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("valid number")
    })
  })

  describe("Null/undefined handling", () => {
    test("accepts null ports", () => {
      const result = validatePortRange(null, null, "tcp")
      expect(result.valid).toBe(true)
    })

    test("accepts undefined ports", () => {
      const result = validatePortRange(undefined, undefined, "tcp")
      expect(result.valid).toBe(true)
    })

    test("accepts null protocol", () => {
      const result = validatePortRange(80, 80, null)
      expect(result.valid).toBe(true)
    })
  })
})

// ─── validateIcmpTypeCode Tests ───────────────────────────────────────────────

describe("validateIcmpTypeCode", () => {
  describe("Valid values", () => {
    test("accepts valid ICMP type", () => {
      const result = validateIcmpTypeCode(8, null)
      expect(result.valid).toBe(true)
    })

    test("accepts valid ICMP code", () => {
      const result = validateIcmpTypeCode(null, 0)
      expect(result.valid).toBe(true)
    })

    test("accepts valid type and code", () => {
      const result = validateIcmpTypeCode(8, 0)
      expect(result.valid).toBe(true)
    })

    test("accepts 0 for both type and code", () => {
      const result = validateIcmpTypeCode(0, 0)
      expect(result.valid).toBe(true)
    })

    test("accepts 255 for both type and code", () => {
      const result = validateIcmpTypeCode(255, 255)
      expect(result.valid).toBe(true)
    })

    test("accepts null values", () => {
      const result = validateIcmpTypeCode(null, null)
      expect(result.valid).toBe(true)
    })
  })

  describe("Invalid values", () => {
    test("rejects negative ICMP type", () => {
      const result = validateIcmpTypeCode(-1, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("type")
    })

    test("rejects ICMP type above 255", () => {
      const result = validateIcmpTypeCode(256, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("type")
    })

    test("rejects negative ICMP code", () => {
      const result = validateIcmpTypeCode(8, -1)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("code")
    })

    test("rejects ICMP code above 255", () => {
      const result = validateIcmpTypeCode(8, 256)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("code")
    })
  })

  describe("NaN handling", () => {
    test("rejects NaN for type", () => {
      const result = validateIcmpTypeCode(NaN, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("valid number")
    })

    test("rejects NaN for code", () => {
      const result = validateIcmpTypeCode(8, NaN)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("valid number")
    })
  })
})

// ─── isValidCIDR Tests ────────────────────────────────────────────────────────

describe("isValidCIDR", () => {
  describe("IPv4 CIDR validation", () => {
    test("accepts valid IPv4 CIDR", () => {
      expect(isValidCIDR("192.168.1.0/24")).toBe(true)
    })

    test("accepts 0.0.0.0/0", () => {
      expect(isValidCIDR("0.0.0.0/0")).toBe(true)
    })

    test("accepts single IP /32", () => {
      expect(isValidCIDR("10.0.0.1/32")).toBe(true)
    })

    test("accepts 255.255.255.255/32", () => {
      expect(isValidCIDR("255.255.255.255/32")).toBe(true)
    })

    test("rejects IPv4 with invalid octet", () => {
      expect(isValidCIDR("256.1.1.1/24")).toBe(false)
    })

    test("rejects IPv4 with negative octet", () => {
      expect(isValidCIDR("192.168.-1.0/24")).toBe(false)
    })

    test("rejects IPv4 with prefix > 32", () => {
      expect(isValidCIDR("192.168.1.0/33")).toBe(false)
    })

    test("rejects IPv4 with non-numeric octet", () => {
      expect(isValidCIDR("192.168.1.abc/24")).toBe(false)
    })

    test("rejects IPv4 with wrong number of octets", () => {
      expect(isValidCIDR("192.168.1/24")).toBe(false)
    })
  })

  describe("IPv6 CIDR validation", () => {
    test("accepts valid IPv6 CIDR", () => {
      expect(isValidCIDR("2001:db8::/32")).toBe(true)
    })

    test("accepts ::/0", () => {
      expect(isValidCIDR("::/0")).toBe(true)
    })

    test("accepts compressed IPv6", () => {
      expect(isValidCIDR("fe80::1/64")).toBe(true)
    })

    test("accepts full IPv6 address", () => {
      expect(isValidCIDR("2001:0db8:0000:0000:0000:0000:0000:0001/128")).toBe(true)
    })

    test("rejects IPv6 with prefix > 128", () => {
      expect(isValidCIDR("2001:db8::/129")).toBe(false)
    })

    test("rejects IPv6 with invalid hex", () => {
      expect(isValidCIDR("2001:xyz::/32")).toBe(false)
    })

    test("rejects IPv6 with triple colon", () => {
      expect(isValidCIDR("2001:db8:::/32")).toBe(false)
    })

    test("rejects IPv6 with too many segments", () => {
      expect(isValidCIDR("1:2:3:4:5:6:7:8:9/64")).toBe(false)
    })

    test("rejects IPv6 with segment too long", () => {
      expect(isValidCIDR("12345::/64")).toBe(false)
    })

    test("rejects IPv6 with leading single colon", () => {
      expect(isValidCIDR(":2001:db8::/32")).toBe(false)
    })

    test("rejects IPv6 with trailing single colon", () => {
      expect(isValidCIDR("2001:db8::/32:")).toBe(false)
    })

    test("rejects IPv6 with multiple double colons", () => {
      expect(isValidCIDR("2001::db8::/32")).toBe(false)
    })
  })

  describe("Format validation", () => {
    test("rejects CIDR without slash", () => {
      expect(isValidCIDR("192.168.1.0")).toBe(false)
    })

    test("rejects CIDR with multiple slashes", () => {
      expect(isValidCIDR("192.168.1.0/24/32")).toBe(false)
    })

    test("rejects empty string", () => {
      expect(isValidCIDR("")).toBe(false)
    })

    test("rejects CIDR with non-numeric prefix", () => {
      expect(isValidCIDR("192.168.1.0/abc")).toBe(false)
    })

    test("rejects CIDR with negative prefix", () => {
      expect(isValidCIDR("192.168.1.0/-1")).toBe(false)
    })

    test("rejects CIDR with prefix containing letters", () => {
      expect(isValidCIDR("192.168.1.0/24a")).toBe(false)
    })

    test("rejects CIDR without address", () => {
      expect(isValidCIDR("/24")).toBe(false)
    })

    test("rejects CIDR without prefix", () => {
      expect(isValidCIDR("192.168.1.0/")).toBe(false)
    })
  })
})

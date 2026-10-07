import { describe, test, expect } from "vitest"
import { normalizeProtocol, isValidProtocolFormat, hasIcmpFields } from "./constants"

describe("normalizeProtocol", () => {
  test.each([
    [" GRE ", "gre"],
    ["IPv6-ICMP", "ipv6-icmp"],
    ["47", "47"],
    ["01", "1"],
    ["058", "58"],
    ["000", "0"],
    ["   ", null],
    ["", null],
    [null, null],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeProtocol(input)).toBe(expected)
  })
})

describe("isValidProtocolFormat", () => {
  test.each(["tcp", "gre", "ipv6-icmp", "udplite", "0", "47", "255"])("accepts %j", (protocol) => {
    expect(isValidProtocolFormat(protocol)).toBe(true)
  })

  test.each(["256", "1000", "-1", "tc p", "tcp!", "6a", "-gre", "4.5"])("rejects %j", (protocol) => {
    expect(isValidProtocolFormat(protocol)).toBe(false)
  })
})

describe("hasIcmpFields", () => {
  test("is true for a custom ICMP rule", () => {
    expect(hasIcmpFields("custom-icmp", "icmp")).toBe(true)
  })

  test("is false for All ICMP", () => {
    expect(hasIcmpFields("all-icmp", "icmp")).toBe(false)
  })

  test.each(["icmp", "ICMP", " ipv6-icmp ", "icmpv6", "1", "58", "01", "058"])(
    "is true for Other Protocol with %j",
    (protocol) => {
      expect(hasIcmpFields("other-protocol", protocol)).toBe(true)
    }
  )

  test("is false for Other Protocol with a non-ICMP protocol", () => {
    expect(hasIcmpFields("other-protocol", "gre")).toBe(false)
  })
})

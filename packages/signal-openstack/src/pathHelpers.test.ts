import { describe, it, expect } from "vitest"
import { encodeOpenstackPathSegment, encodeOpenstackPath, validateAndEncodeResourceId } from "./pathHelpers"

describe("encodeOpenstackPathSegment", () => {
  // Happy path
  it("should encode valid segments", () => {
    expect(encodeOpenstackPathSegment("flavor-123")).toBe("flavor-123")
    expect(encodeOpenstackPathSegment("my container")).toBe("my%20container")
  })

  // Critical edge cases - security vulnerabilities
  it("should reject path traversal", () => {
    expect(() => encodeOpenstackPathSegment("../admin")).toThrow("path traversal")
    expect(() => encodeOpenstackPathSegment("./admin")).toThrow("path traversal")
    expect(() => encodeOpenstackPathSegment("admin/secrets")).toThrow("must not contain slashes")
  })

  it("should reject URL special characters", () => {
    expect(() => encodeOpenstackPathSegment("id?x=1")).toThrow("URL special")
    expect(() => encodeOpenstackPathSegment("id#frag")).toThrow("URL special")
  })
})

describe("encodeOpenstackPath", () => {
  // Happy path
  it("should encode and join segments", () => {
    expect(encodeOpenstackPath("flavors", "abc-123", "os-extra_specs")).toBe("flavors/abc-123/os-extra_specs")
  })

  // Critical edge case
  it("should reject traversal in any segment", () => {
    expect(() => encodeOpenstackPath("flavors", "../admin")).toThrow("path traversal")
  })
})

describe("validateAndEncodeResourceId", () => {
  // Happy path - supports both UUIDs and custom IDs
  it("should validate and encode resource IDs", () => {
    expect(validateAndEncodeResourceId("550e8400-e29b-41d4-a716-446655440000", "Flavor")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    )
    expect(validateAndEncodeResourceId("m1.small", "Flavor")).toBe("m1.small")
  })

  // Critical edge cases - path traversal attacks
  it("should reject path traversal", () => {
    expect(() => validateAndEncodeResourceId("../admin", "Flavor")).toThrow("path traversal")
    expect(() => validateAndEncodeResourceId("flavor/admin", "Flavor")).toThrow("must not contain slashes")
  })
})

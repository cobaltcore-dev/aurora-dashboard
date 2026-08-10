import { describe, expect, it } from "vitest"
import { isAbsoluteUrl, validateRelativeUrl } from "./urlValidation"
import { TRPCError } from "@trpc/server"

describe("isAbsoluteUrl", () => {
  it("should return true for http URLs", () => {
    expect(isAbsoluteUrl("http://example.com")).toBe(true)
    expect(isAbsoluteUrl("http://localhost:3000/path")).toBe(true)
  })

  it("should return true for https URLs", () => {
    expect(isAbsoluteUrl("https://example.com")).toBe(true)
    expect(isAbsoluteUrl("https://api.example.com/v1/images")).toBe(true)
  })

  it("should return true for scheme-relative URLs", () => {
    expect(isAbsoluteUrl("//example.com")).toBe(true)
    expect(isAbsoluteUrl("//api.example.com/path")).toBe(true)
  })

  it("should return true for URLs with whitespace prefix", () => {
    expect(isAbsoluteUrl("  http://example.com")).toBe(true)
    expect(isAbsoluteUrl("\thttps://example.com")).toBe(true)
    expect(isAbsoluteUrl(" //example.com")).toBe(true)
  })

  it("should return true for case-insensitive protocols", () => {
    expect(isAbsoluteUrl("HTTP://example.com")).toBe(true)
    expect(isAbsoluteUrl("HTTPS://example.com")).toBe(true)
    expect(isAbsoluteUrl("HtTp://example.com")).toBe(true)
  })

  it("should return false for relative URLs", () => {
    expect(isAbsoluteUrl("/api/v1/images")).toBe(false)
    expect(isAbsoluteUrl("api/v1/images")).toBe(false)
    expect(isAbsoluteUrl("../images")).toBe(false)
    expect(isAbsoluteUrl("./images")).toBe(false)
  })

  it("should return false for query strings", () => {
    expect(isAbsoluteUrl("?page=2&limit=10")).toBe(false)
  })

  it("should return false for empty string", () => {
    expect(isAbsoluteUrl("")).toBe(false)
  })

  it("should return false for paths with colons", () => {
    expect(isAbsoluteUrl("/path:with:colons")).toBe(false)
  })
})

describe("validateRelativeUrl", () => {
  it("should not throw for valid relative URLs", () => {
    expect(() => validateRelativeUrl("/api/v1/images", "pagination URL")).not.toThrow()
    expect(() => validateRelativeUrl("api/v1/images", "pagination URL")).not.toThrow()
    expect(() => validateRelativeUrl("?page=2", "pagination URL")).not.toThrow()
  })

  it("should not throw for undefined", () => {
    expect(() => validateRelativeUrl(undefined, "pagination URL")).not.toThrow()
  })

  it("should throw TRPCError for absolute http URLs", () => {
    expect(() => validateRelativeUrl("http://example.com", "pagination URL")).toThrow(TRPCError)
    try {
      validateRelativeUrl("http://example.com", "pagination URL")
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError)
      expect((error as TRPCError).code).toBe("BAD_REQUEST")
      expect((error as TRPCError).message).toContain("absolute URLs are not allowed")
      expect((error as TRPCError).message).toContain("pagination URL")
    }
  })

  it("should throw TRPCError for absolute https URLs", () => {
    expect(() => validateRelativeUrl("https://example.com", "pagination URL")).toThrow(TRPCError)
  })

  it("should throw TRPCError for scheme-relative URLs", () => {
    expect(() => validateRelativeUrl("//example.com", "pagination URL")).toThrow(TRPCError)
  })

  it("should include parameter name in error message", () => {
    try {
      validateRelativeUrl("https://example.com", "first parameter")
    } catch (error) {
      expect((error as TRPCError).message).toContain("first parameter")
    }

    try {
      validateRelativeUrl("https://example.com", "next parameter")
    } catch (error) {
      expect((error as TRPCError).message).toContain("next parameter")
    }
  })
})

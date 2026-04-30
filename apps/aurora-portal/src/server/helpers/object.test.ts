import { describe, it, expect } from "vitest"
import { omit } from "./object"

describe("omit", () => {
  it("should omit a single key from object", () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = omit(obj, "b")

    expect(result).toEqual({ a: 1, c: 3 })
    expect(result).not.toHaveProperty("b")
  })

  it("should omit multiple keys from object", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 }
    const result = omit(obj, "b", "d")

    expect(result).toEqual({ a: 1, c: 3 })
    expect(result).not.toHaveProperty("b")
    expect(result).not.toHaveProperty("d")
  })

  it("should return new object without mutating original", () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = omit(obj, "b")

    expect(obj).toEqual({ a: 1, b: 2, c: 3 }) // Original unchanged
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it("should handle omitting non-existent key gracefully", () => {
    const obj = { a: 1, b: 2 }
    const result = omit(obj, "c" as keyof typeof obj)

    expect(result).toEqual({ a: 1, b: 2 })
  })

  it("should work with project_id use case", () => {
    const input = { project_id: "abc-123", name: "test", status: "active" }
    const result = omit(input, "project_id")

    expect(result).toEqual({ name: "test", status: "active" })
    expect(result).not.toHaveProperty("project_id")
  })

  it("should preserve type safety", () => {
    const obj = { a: 1, b: "string", c: true }
    const result = omit(obj, "b")

    // TypeScript should infer result as { a: number, c: boolean }
    expect(result.a).toBe(1)
    expect(result.c).toBe(true)
  })
})

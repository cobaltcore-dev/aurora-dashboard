import { describe, it, expect } from "vitest"
import { shootSchema, shootListSchema } from "./shoot"

describe("shootSchema", () => {
  it("parses a minimal shoot", () => {
    const result = shootSchema.safeParse({
      metadata: { name: "test" },
    })
    expect(result.success).toBe(true)
  })

  it("parses a shoot with all optional fields", () => {
    const result = shootSchema.safeParse({
      metadata: {
        name: "test",
        namespace: "garden-qa-de-1-p-1",
        uid: "abc-123",
        resourceVersion: "12345",
        labels: { key: "value" },
        annotations: { key: "value" },
        deletionTimestamp: "2026-11-19T10:00:00Z",
      },
      spec: { kubernetes: { version: "1.30.2" } },
      status: { conditions: [] },
    })
    expect(result.success).toBe(true)
  })

  it("allows extra fields due to passthrough", () => {
    const result = shootSchema.safeParse({
      metadata: { name: "test", extraField: "ignored" },
      spec: { extraField: "ignored" },
      status: { extraField: "ignored" },
      extraTopLevel: "ignored",
    })
    expect(result.success).toBe(true)
  })
})

describe("shootListSchema", () => {
  it("parses an empty list", () => {
    const result = shootListSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual([])
    }
  })

  it("parses a list with shoots", () => {
    const result = shootListSchema.safeParse({
      items: [{ metadata: { name: "shoot-1" } }, { metadata: { name: "shoot-2" } }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(2)
    }
  })
})

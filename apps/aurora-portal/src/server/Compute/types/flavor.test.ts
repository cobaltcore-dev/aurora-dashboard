import { describe, it, expect } from "vitest"
import { flavorSchema, flavorResponseSchema } from "./flavor"

describe("Flavor Schema Validation", () => {
  const minimalValidFlavor = {
    id: "1",
    name: "m1.tiny",
  }

  // Complete flavor data with all fields
  const completeValidFlavor = {
    "OS-FLV-DISABLED:disabled": false,
    "OS-FLV-EXT-DATA:ephemeral": 0,
    "os-flavor-access:is_public": true,
    id: "2",
    name: "m1.small",
    vcpus: 1,
    ram: 2048,
    disk: 20,
    swap: 0,
    rxtx_factor: 1.0,
    description: null,
    links: [
      { href: "http://openstack.example.com/v2/project_id/flavors/2", rel: "self" },
      { href: "http://openstack.example.com/project_id/flavors/2", rel: "bookmark" },
    ],
    extra_specs: {
      "hw:cpu_policy": "shared",
      "hw:numa_nodes": "1",
    },
  }

  it("should validate a minimal valid flavor", () => {
    const result = flavorSchema.safeParse(minimalValidFlavor)
    expect(result.success).toBe(true)
  })

  it("should validate a complete valid flavor", () => {
    const result = flavorSchema.safeParse(completeValidFlavor)
    expect(result.success).toBe(true)
  })

  it("should reject a flavor without an id", () => {
    const invalidFlavor = { ...minimalValidFlavor, id: undefined }
    const result = flavorSchema.safeParse(invalidFlavor)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("id")
    }
  })

  it("should validate flavor response with array of flavors", () => {
    const response = {
      flavors: [minimalValidFlavor, completeValidFlavor],
    }
    const result = flavorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should reject flavor response without flavors array", () => {
    const response = {}
    const result = flavorResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it("should validate with unexpected extra properties", () => {
    const flavor = {
      ...minimalValidFlavor,
      some_future_property: "value",
      another_property: 123,
    }
    const result = flavorSchema.safeParse(flavor)
    expect(result.success).toBe(true)
  })
})

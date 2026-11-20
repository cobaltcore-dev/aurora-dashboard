import { describe, it, expect } from "vitest"
import { gardenerInfoConfigMapSchema, gardenerInfoInputSchema, parseGardenerApiServerVersion } from "./gardenerInfo"

describe("parseGardenerApiServerVersion", () => {
  it("parses the documented example", () => {
    const yaml = "version: v1.111.0\nworkloadIdentityIssuerURL: https://example.com/issuer\n"
    expect(parseGardenerApiServerVersion(yaml)).toBe("v1.111.0")
  })

  it.each(['version: "v1.2.3"', "version: 'v1.2.3'"])("handles quoted versions: %s", (yaml) => {
    expect(parseGardenerApiServerVersion(yaml)).toBe("v1.2.3")
  })

  it.each([undefined, "", "workloadIdentityIssuerURL: x", "nested:\n  version: v1.0.0"])(
    "returns null for %j",
    (yaml) => {
      expect(parseGardenerApiServerVersion(yaml)).toBeNull()
    }
  )
})

describe("gardenerInfoConfigMapSchema", () => {
  it("accepts extra fields", () => {
    expect(
      gardenerInfoConfigMapSchema.safeParse({ kind: "ConfigMap", metadata: {}, data: { gardenerAPIServer: "x" } })
        .success
    ).toBe(true)
  })

  it("accepts a ConfigMap without data", () => {
    expect(gardenerInfoConfigMapSchema.safeParse({ kind: "ConfigMap" }).success).toBe(true)
  })
})

describe("gardenerInfoInputSchema", () => {
  it("accepts a known landscape", () => {
    expect(gardenerInfoInputSchema.safeParse({ project_id: "p-1", landscape: "qa" }).success).toBe(true)
  })

  it("rejects an unknown landscape", () => {
    expect(gardenerInfoInputSchema.safeParse({ project_id: "p-1", landscape: "production" }).success).toBe(false)
  })

  it("rejects an empty project_id", () => {
    expect(gardenerInfoInputSchema.safeParse({ project_id: "", landscape: "qa" }).success).toBe(false)
  })
})

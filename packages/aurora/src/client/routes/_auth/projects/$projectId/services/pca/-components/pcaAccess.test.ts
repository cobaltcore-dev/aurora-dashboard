import { describe, it, expect } from "vitest"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { canAccessClavisPca } from "./pcaAccess"

describe("pcaAccess", () => {
  it("allows access when PCA service exists and enabledServices is undefined", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis" }])

    expect(canAccessClavisPca(serviceIndex)).toBe(true)
  })

  it("denies access when PCA is not in enabledServices", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis" }])

    expect(canAccessClavisPca(serviceIndex, ["images", "flavors"])).toBe(false)
  })

  it("allows access when PCA is in enabledServices", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis" }])

    expect(canAccessClavisPca(serviceIndex, ["pca"])).toBe(true)
  })

  it("allows access when service name is clavis and PCA is enabled", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis" }])

    expect(canAccessClavisPca(serviceIndex, ["pca"])).toBe(true)
  })
})

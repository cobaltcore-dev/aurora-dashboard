import { describe, it, expect } from "vitest"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { canAccessClavisPca, hasClavisPcaService } from "./pcaAccess"

describe("pcaAccess", () => {
  it("returns true when clavis-beta PCA service is available", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis-beta" }])

    expect(hasClavisPcaService(serviceIndex)).toBe(true)
  })

  it("returns true when clavis-dev PCA service is available", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis-dev" }])

    expect(hasClavisPcaService(serviceIndex)).toBe(true)
  })

  it("returns false when no recognized PCA service is available", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "other" }])

    expect(hasClavisPcaService(serviceIndex)).toBe(false)
  })

  it("allows access when PCA service exists and enabledServices is undefined", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis-beta" }])

    expect(canAccessClavisPca(serviceIndex)).toBe(true)
  })

  it("denies access when PCA is not in enabledServices", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis-beta" }])

    expect(canAccessClavisPca(serviceIndex, ["images", "flavors"])).toBe(false)
  })

  it("allows access when PCA is in enabledServices", () => {
    const serviceIndex = getServiceIndex([{ type: "pca", name: "clavis-beta" }])

    expect(canAccessClavisPca(serviceIndex, ["pca"])).toBe(true)
  })
})

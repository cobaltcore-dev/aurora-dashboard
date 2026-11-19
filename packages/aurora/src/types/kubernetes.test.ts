import { describe, it, expect } from "vitest"
import { KUBERNETES_LANDSCAPES, KUBERNETES_LANDSCAPE_KEYS, findLandscapeService } from "./kubernetes"

describe("kubernetes landscapes", () => {
  it("keeps the key list in sync with the landscape map", () => {
    expect([...KUBERNETES_LANDSCAPE_KEYS]).toEqual(Object.keys(KUBERNETES_LANDSCAPES))
  })

  it("finds a service by type", () => {
    const services = [{ type: "persephone-qa", name: "other" }]
    expect(findLandscapeService(services, "qa")).toBe(services[0])
  })

  it("finds a service by name", () => {
    const services = [{ type: "other", name: "persephone-canary" }]
    expect(findLandscapeService(services, "canary")).toBe(services[0])
  })

  it("returns undefined when the catalog has no such service", () => {
    expect(findLandscapeService([{ type: "compute", name: "nova" }], "prod")).toBeUndefined()
  })
})

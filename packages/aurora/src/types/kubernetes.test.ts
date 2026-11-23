import { describe, it, expect } from "vitest"
import { hasAnyLandscapeService, getAvailableLandscapes, findLandscapeService } from "./kubernetes"

describe("kubernetes utilities", () => {
  const mockServices = [
    { type: "persephone-qa", name: "persephone-qa" },
    { type: "persephone-prod", name: "persephone-prod" },
    { type: "compute", name: "nova" },
  ]

  describe("hasAnyLandscapeService", () => {
    it("returns true when at least one Persephone service exists", () => {
      expect(hasAnyLandscapeService(mockServices)).toBe(true)
    })

    it("returns true when only qa landscape exists", () => {
      const services = [{ type: "persephone-qa", name: "persephone-qa" }]
      expect(hasAnyLandscapeService(services)).toBe(true)
    })

    it("returns true when only canary landscape exists", () => {
      const services = [{ type: "persephone-canary", name: "persephone-canary" }]
      expect(hasAnyLandscapeService(services)).toBe(true)
    })

    it("returns true when only prod landscape exists", () => {
      const services = [{ type: "persephone-prod", name: "persephone-prod" }]
      expect(hasAnyLandscapeService(services)).toBe(true)
    })

    it("returns false when no Persephone services exist", () => {
      const services = [
        { type: "compute", name: "nova" },
        { type: "network", name: "neutron" },
      ]
      expect(hasAnyLandscapeService(services)).toBe(false)
    })

    it("returns false when services array is empty", () => {
      expect(hasAnyLandscapeService([])).toBe(false)
    })
  })

  describe("getAvailableLandscapes", () => {
    it("returns all available landscapes", () => {
      const result = getAvailableLandscapes(mockServices)
      expect(result).toEqual(["qa", "prod"])
    })

    it("returns only qa when only qa exists", () => {
      const services = [{ type: "persephone-qa", name: "persephone-qa" }]
      expect(getAvailableLandscapes(services)).toEqual(["qa"])
    })

    it("returns only canary when only canary exists", () => {
      const services = [{ type: "persephone-canary", name: "persephone-canary" }]
      expect(getAvailableLandscapes(services)).toEqual(["canary"])
    })

    it("returns only prod when only prod exists", () => {
      const services = [{ type: "persephone-prod", name: "persephone-prod" }]
      expect(getAvailableLandscapes(services)).toEqual(["prod"])
    })

    it("returns all three landscapes when all exist", () => {
      const services = [
        { type: "persephone-qa", name: "persephone-qa" },
        { type: "persephone-canary", name: "persephone-canary" },
        { type: "persephone-prod", name: "persephone-prod" },
      ]
      expect(getAvailableLandscapes(services)).toEqual(["qa", "canary", "prod"])
    })

    it("returns empty array when no Persephone services exist", () => {
      const services = [{ type: "compute", name: "nova" }]
      expect(getAvailableLandscapes(services)).toEqual([])
    })

    it("returns empty array when services array is empty", () => {
      expect(getAvailableLandscapes([])).toEqual([])
    })
  })

  describe("findLandscapeService", () => {
    it("finds service by type", () => {
      const result = findLandscapeService(mockServices, "qa")
      expect(result).toEqual({ type: "persephone-qa", name: "persephone-qa" })
    })

    it("finds service by name", () => {
      const services = [{ type: "something-else", name: "persephone-qa" }]
      const result = findLandscapeService(services, "qa")
      expect(result).toEqual({ type: "something-else", name: "persephone-qa" })
    })

    it("returns undefined when service does not exist", () => {
      const services = [{ type: "compute", name: "nova" }]
      const result = findLandscapeService(services, "qa")
      expect(result).toBeUndefined()
    })
  })
})

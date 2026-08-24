import { describe, it, expect, beforeAll } from "vitest"
import { i18n } from "@lingui/core"
import { buildNavSections } from "./buildNavSections"
import type { AdditionalProjectService } from "@/client/AuroraApp"
import type { AnyRoute } from "@tanstack/react-router"

beforeAll(() => {
  i18n.load({ en: {} })
  i18n.activate("en")
})

const ALL_SERVICES = [
  { type: "image", name: "glance" },
  { type: "compute", name: "nova" },
  { type: "network", name: "neutron" },
  { type: "object-store", name: "swift" },
  { type: "object-store-ceph", name: "ceph" },
]

const CUSTOM_SERVICE: AdditionalProjectService = {
  serviceType: "custom-service",
  serviceName: "custom-provider",
  label: "Custom Service",
  routes: {} as unknown as AnyRoute,
}

describe("buildNavSections", () => {
  it("returns built-in sections when all services are available", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)
    const keys = sections.map((s) => s.section)
    expect(keys).toEqual(["compute", "network", "storage"])
  })

  it("includes the correct services in each built-in section", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)

    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).toEqual(["images", "flavors"])

    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "floatingips"])

    const storage = sections.find((s) => s.section === "storage")
    expect(storage?.services.map((s) => s.service)).toContain("containers")
    expect(storage?.services.map((s) => s.service)).toContain("ceph-containers")
  })

  it("omits a section when none of its services are available", () => {
    const sections = buildNavSections("proj-1", [])
    const keys = sections.map((s) => s.section)
    expect(keys).not.toContain("compute")
    expect(keys).not.toContain("network")
    expect(keys).not.toContain("storage")
  })

  it("omits network section when network service is absent", () => {
    const withoutNetwork = ALL_SERVICES.filter((s) => s.type !== "network")
    const sections = buildNavSections("proj-1", withoutNetwork)
    expect(sections.map((s) => s.section)).not.toContain("network")
  })

  it("sets correct params for each nav item", () => {
    const sections = buildNavSections("proj-42", ALL_SERVICES)
    const computeItems = sections.find((s) => s.section === "compute")?.services ?? []
    for (const item of computeItems) {
      expect(item.params.projectId).toBe("proj-42")
    }
  })

  describe("additionalProjectServices", () => {
    it("adds a service nav item in the services section when its service is in the catalog", () => {
      const services = [...ALL_SERVICES, { type: "custom-service", name: "custom-provider" }]
      const sections = buildNavSections("proj-1", services, undefined, [CUSTOM_SERVICE])
      const servicesSection = sections.find((s) => s.section === "services")
      expect(servicesSection?.services.map((s) => s.service)).toEqual(["custom-service"])
    })

    it("omits a service nav item when its service is absent from the catalog", () => {
      const sections = buildNavSections("proj-1", ALL_SERVICES, undefined, [CUSTOM_SERVICE])
      expect(sections.map((s) => s.section)).not.toContain("services")
    })

    it("respects enabledServices filter for additional project services", () => {
      const services = [...ALL_SERVICES, { type: "custom-service", name: "custom-provider" }]
      const sections = buildNavSections("proj-1", services, ["images"], [CUSTOM_SERVICE])
      expect(sections.map((s) => s.section)).not.toContain("services")
    })
  })
})

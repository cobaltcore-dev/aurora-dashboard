import { describe, it, expect, beforeAll } from "vitest"
import { i18n } from "@lingui/core"
import { buildNavSections } from "./buildNavSections"
import type { ServiceExtension } from "@/client/AuroraApp"

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

const CUSTOM_SERVICE: ServiceExtension = {
  serviceType: "custom-service",
  serviceName: "custom-provider",
  label: "Custom Service",
  component: () => null,
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
    expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "floatingips", "routers", "ports"])

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

  it("respects enabledServices filter for routers", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["securitygroups", "floatingips"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "floatingips"])
  })

  it("shows only routers in the network section when it is the only enabled network service", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["routers"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["routers"])
    expect(network?.services[0].params).toEqual({ projectId: "proj-1" })
  })

  it("respects enabledServices filter for ports", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["securitygroups", "floatingips", "routers"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "floatingips", "routers"])
  })

  it("shows only ports in the network section when it is the only enabled network service", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["ports"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["ports"])
    expect(network?.services[0].params).toEqual({ projectId: "proj-1" })
  })

  it("sets correct params for each nav item", () => {
    const sections = buildNavSections("proj-42", ALL_SERVICES)
    const computeItems = sections.find((s) => s.section === "compute")?.services ?? []
    for (const item of computeItems) {
      expect(item.params.projectId).toBe("proj-42")
    }
  })

  describe("Ceph catalog lookup by service name (D6/D9)", () => {
    it("shows the Ceph nav item when Ceph is registered under the object-store type (not just object-store-ceph)", () => {
      const services = [
        { type: "image", name: "glance" },
        { type: "object-store", name: "ceph" },
      ]
      const sections = buildNavSections("proj-1", services)
      const storage = sections.find((s) => s.section === "storage")
      expect(storage?.services.map((s) => s.service)).toContain("ceph-containers")
    })
  })

  describe("serviceExtensions", () => {
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

  describe("deniedServices", () => {
    it("hides a service via deniedServices alone, with no allow/enabled list (deny-only)", () => {
      const sections = buildNavSections("proj-1", ALL_SERVICES, undefined, undefined, ["floatingips"])
      const network = sections.find((s) => s.section === "network")
      expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "routers", "ports"])
    })

    it("deny wins over an explicit enabledServices entry", () => {
      const sections = buildNavSections("proj-1", ALL_SERVICES, ["images", "flavors"], undefined, ["flavors"])
      const compute = sections.find((s) => s.section === "compute")
      expect(compute?.services.map((s) => s.service)).toEqual(["images"])
    })

    it("hides an extension service listed in deniedServices", () => {
      const services = [...ALL_SERVICES, { type: "custom-service", name: "custom-provider" }]
      const sections = buildNavSections("proj-1", services, undefined, [CUSTOM_SERVICE], ["custom-service"])
      expect(sections.map((s) => s.section)).not.toContain("services")
    })
  })
})

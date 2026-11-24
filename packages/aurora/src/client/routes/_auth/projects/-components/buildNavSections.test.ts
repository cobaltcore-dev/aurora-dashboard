import { describe, it, expect, beforeAll } from "vitest"
import { i18n } from "@lingui/core"
import { msg } from "@lingui/core/macro"
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
  it("sorts all groups alphabetically, including Authorization and Services", () => {
    const sections = buildNavSections(
      "proj-1",
      [...ALL_SERVICES, { type: "key-manager", name: "barbican" }, { type: "custom-service", name: "custom-provider" }],
      undefined,
      [CUSTOM_SERVICE]
    )
    expect(sections.map((section) => section.label)).toEqual([
      "Authorization",
      "Compute",
      "Network",
      "Services",
      "Storage",
    ])
  })

  it("sorts extension items by label rather than registration order or service type", () => {
    const extensions = [
      { ...CUSTOM_SERVICE, serviceType: "a-service", label: "Zulu" },
      { ...CUSTOM_SERVICE, serviceType: "z-service", label: "alpha" },
      { ...CUSTOM_SERVICE, serviceType: "m-service", label: "Bravo" },
    ]
    const catalog = extensions.map((extension) => ({ type: extension.serviceType, name: extension.serviceName }))
    const sections = buildNavSections("proj-1", catalog, undefined, extensions)
    expect(sections[0].services.map((service) => service.label)).toEqual(["alpha", "Bravo", "Zulu"])
    expect(extensions.map((extension) => extension.label)).toEqual(["Zulu", "alpha", "Bravo"])
  })

  it("sorts translated labels instead of English labels or section IDs", () => {
    i18n.load("de", {
      [msg`Compute`.id]: "Z-Rechnen",
      [msg`Network`.id]: "A-Netzwerk",
      [msg`Storage`.id]: "B-Speicher",
      [msg`Flavors`.id]: "Z-Varianten",
      [msg`Images`.id]: "A-Abbilder",
      [msg`Instances`.id]: "M-Instanzen",
    })
    i18n.activate("de")
    try {
      const sections = buildNavSections("proj-1", ALL_SERVICES)
      expect(sections.map((section) => section.section)).toEqual(["network", "storage", "compute"])
      expect(
        sections.find((section) => section.section === "compute")?.services.map((service) => service.service)
      ).toEqual(["images", "instances", "flavors"])
    } finally {
      i18n.activate("en")
    }
  })

  it("uses the active locale for accented extension labels", () => {
    i18n.load("sv", {})
    i18n.activate("sv")
    try {
      const extensions = ["Örebro", "Älmhult", "Åre", "Zebra"].map((label, index) => ({
        ...CUSTOM_SERVICE,
        serviceType: `service-${index}`,
        label,
      }))
      const catalog = extensions.map((extension) => ({ type: extension.serviceType, name: extension.serviceName }))
      const sections = buildNavSections("proj-1", catalog, undefined, extensions)
      expect(sections[0].services.map((service) => service.label)).toEqual(["Zebra", "Åre", "Älmhult", "Örebro"])
    } finally {
      i18n.activate("en")
    }
  })

  it("groups volumes under Storage and gates them by catalog, capability, and configuration", () => {
    const services = [...ALL_SERVICES, { type: "volumev3", name: "cinderv3" }]
    const navServices = (sections: ReturnType<typeof buildNavSections>) =>
      sections.flatMap((section) => section.services.map((service) => service.service))
    expect(navServices(buildNavSections("proj-1", services))).not.toContain("volumes")
    const sections = buildNavSections("proj-1", services, undefined, undefined, undefined, true)
    expect(
      sections.find((section) => section.section === "storage")?.services.map((service) => service.service)
    ).toEqual(["ceph-containers", "containers", "volumes"])
    expect(sections.some((section) => section.section === "block-storage")).toBe(false)
    expect(navServices(buildNavSections("proj-1", services, undefined, undefined, ["volumes"], true))).not.toContain(
      "volumes"
    )
    expect(navServices(buildNavSections("proj-1", services, ["containers"], undefined, undefined, true))).not.toContain(
      "volumes"
    )
    expect(navServices(buildNavSections("proj-1", ALL_SERVICES, undefined, undefined, undefined, true))).not.toContain(
      "volumes"
    )
  })

  it("shows Storage when Cinder is the only available service", () => {
    const sections = buildNavSections(
      "proj-1",
      [{ type: "volumev3", name: "cinderv3" }],
      undefined,
      undefined,
      undefined,
      true
    )
    expect(sections.map((section) => section.section)).toEqual(["storage"])
    expect(sections[0].label).toBe("Storage")
    expect(sections[0].services.map((service) => service.service)).toEqual(["volumes"])
  })

  it("returns built-in sections when all services are available", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)
    const keys = sections.map((s) => s.section)
    expect(keys).toEqual(["compute", "network", "storage"])
  })

  it("includes the correct services in each built-in section", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)

    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).toEqual(["flavors", "images", "instances"])

    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual([
      "floatingips",
      "networks",
      "ports",
      "routers",
      "securitygroups",
    ])

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

  it("includes instances in compute only when nova is available", () => {
    const withoutNova = ALL_SERVICES.filter((s) => s.name !== "nova")
    const sections = buildNavSections("proj-1", withoutNova)
    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).not.toContain("instances")
  })

  it("respects enabledServices filter for instances", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["instances"])
    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).toEqual(["instances"])
  })

  it("omits instances when denied even if nova is available", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, undefined, undefined, ["instances"])
    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).not.toContain("instances")
  })

  it("respects enabledServices filter for routers", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["securitygroups", "floatingips"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["floatingips", "securitygroups"])
  })

  it("shows only routers in the network section when it is the only enabled network service", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["routers"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["routers"])
    expect(network?.services[0].params).toEqual({ projectId: "proj-1" })
  })

  it("shows only networks in the network section when it is the only enabled network service", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["networks"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["networks"])
    expect(network?.services[0].params).toEqual({ projectId: "proj-1" })
  })

  it("hides networks when it is not in enabledServices", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["securitygroups", "routers"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).not.toContain("networks")
  })

  it("respects enabledServices filter for ports", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES, ["securitygroups", "floatingips", "routers"])
    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["floatingips", "routers", "securitygroups"])
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
      expect(network?.services.map((s) => s.service)).toEqual(["networks", "ports", "routers", "securitygroups"])
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

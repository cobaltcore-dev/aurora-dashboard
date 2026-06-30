import { describe, it, expect, beforeAll } from "vitest"
import { i18n } from "@lingui/core"
import { buildNavSections } from "./buildNavSections"

beforeAll(() => {
  i18n.load({ en: {} })
  i18n.activate("en")
})

const ALL_SERVICES = [
  { type: "image", name: "glance" },
  { type: "compute", name: "nova" },
  { type: "network", name: "neutron" },
  { type: "object-store", name: "swift" },
  { type: "pca", name: "clavis-beta" },
]

describe("buildNavSections", () => {
  it("returns all sections when all services are available", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)
    const keys = sections.map((s) => s.section)
    expect(keys).toEqual(["compute", "network", "storage", "services"])
  })

  it("includes the correct services in each section", () => {
    const sections = buildNavSections("proj-1", ALL_SERVICES)

    const compute = sections.find((s) => s.section === "compute")
    expect(compute?.services.map((s) => s.service)).toEqual(["images", "flavors"])

    const network = sections.find((s) => s.section === "network")
    expect(network?.services.map((s) => s.service)).toEqual(["securitygroups", "floatingips"])

    const storage = sections.find((s) => s.section === "storage")
    expect(storage?.services.map((s) => s.service)).toContain("swift")
    expect(storage?.services.map((s) => s.service)).toContain("ceph")

    const services = sections.find((s) => s.section === "services")
    expect(services?.services.map((s) => s.service)).toEqual(["pca"])
  })

  it("omits a section when none of its services are available", () => {
    const sections = buildNavSections("proj-1", [])
    // storage always has ceph-containers regardless of availableServices,
    // so only compute, network, and services are absent
    const keys = sections.map((s) => s.section)
    expect(keys).not.toContain("compute")
    expect(keys).not.toContain("network")
    expect(keys).not.toContain("services")
  })

  it("omits network section when network service is absent", () => {
    const withoutNetwork = ALL_SERVICES.filter((s) => s.type !== "network")
    const sections = buildNavSections("proj-1", withoutNetwork)
    expect(sections.map((s) => s.section)).not.toContain("network")
  })

  it("omits services section when pca service is absent", () => {
    const withoutPca = ALL_SERVICES.filter((s) => s.type !== "pca")
    const sections = buildNavSections("proj-1", withoutPca)
    expect(sections.map((s) => s.section)).not.toContain("services")
  })

  it("sets correct params for each nav item", () => {
    const sections = buildNavSections("proj-42", ALL_SERVICES)
    const computeItems = sections.find((s) => s.section === "compute")?.services ?? []
    for (const item of computeItems) {
      expect(item.params.projectId).toBe("proj-42")
    }
  })
})

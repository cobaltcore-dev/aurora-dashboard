import { describe, it, expect } from "vitest"
import { resolveAppConfig } from "./resolveAppConfig"
import type { AuroraAppConfig } from "../../types/appConfig"

describe("resolveAppConfig", () => {
  it("returns the base layer when no domain name is given", () => {
    const config: AuroraAppConfig = {
      services: { mode: "allowlist", allow: ["images"] },
      features: { federation: false },
      overrides: [{ domain: /^acme-/, features: { federation: true } }],
    }

    expect(resolveAppConfig(config)).toEqual({
      services: { mode: "allowlist", allow: ["images"] },
      features: { federation: false },
    })
  })

  it("never leaks overrides or the matcher into the result", () => {
    const config: AuroraAppConfig = {
      features: { a: 1 },
      overrides: [{ name: "acme", domain: /^acme-/, features: { b: 2 } }],
    }

    const resolved = resolveAppConfig(config, "acme-prod")
    expect(resolved).not.toHaveProperty("overrides")
    expect(resolved).not.toHaveProperty("domain")
    expect(resolved).not.toHaveProperty("name")
  })

  it("ignores non-matching overrides", () => {
    const config: AuroraAppConfig = {
      features: { federation: false },
      overrides: [{ domain: /^acme-/, features: { federation: true } }],
    }

    expect(resolveAppConfig(config, "other-prod")).toEqual({ features: { federation: false } })
  })

  it("compiles string patterns to a RegExp", () => {
    const config: AuroraAppConfig = {
      overrides: [{ domain: "^acme-", features: { matched: true } }],
    }

    expect(resolveAppConfig(config, "acme-prod")).toEqual({ features: { matched: true } })
    expect(resolveAppConfig(config, "nope")).toEqual({})
  })

  describe("allowlist posture", () => {
    it("enable adds a service, disable removes one, posture stays allowlist", () => {
      const config: AuroraAppConfig = {
        services: { mode: "allowlist", allow: ["images", "ceph-containers"] },
        overrides: [{ domain: /^acme-/, services: { enable: ["flavors"], disable: ["images"] } }],
      }

      expect(resolveAppConfig(config, "acme-prod").services).toEqual({
        mode: "allowlist",
        allow: ["ceph-containers", "flavors"],
      })
      // other domains keep the base allow list
      expect(resolveAppConfig(config, "other").services).toEqual({
        mode: "allowlist",
        allow: ["images", "ceph-containers"],
      })
    })
  })

  describe("denylist posture", () => {
    it("enable lifts a base denial, disable hides more, posture stays denylist", () => {
      const config: AuroraAppConfig = {
        services: { mode: "denylist", deny: ["pca"] },
        overrides: [{ domain: /^acme-/, services: { enable: ["pca"], disable: ["flavors"] } }],
      }

      expect(resolveAppConfig(config, "acme-prod").services).toEqual({ mode: "denylist", deny: ["flavors"] })
      expect(resolveAppConfig(config, "other").services).toEqual({ mode: "denylist", deny: ["pca"] })
    })
  })

  describe("default-open base", () => {
    it("disable turns it into a denylist without flipping to allowlist", () => {
      const config: AuroraAppConfig = {
        overrides: [{ domain: /^acme-/, services: { disable: ["pca"] } }],
      }

      expect(resolveAppConfig(config, "acme-prod").services).toEqual({ mode: "denylist", deny: ["pca"] })
    })

    it("enable alone is a no-op and leaves the domain default-open", () => {
      const config: AuroraAppConfig = {
        overrides: [{ domain: /^acme-/, services: { enable: ["images"] } }],
      }

      expect(resolveAppConfig(config, "acme-prod")).toEqual({})
    })
  })

  it("applies disable after enable so disable wins within one override", () => {
    const config: AuroraAppConfig = {
      services: { mode: "allowlist", allow: ["images"] },
      overrides: [{ domain: /^acme-/, services: { enable: ["flavors"], disable: ["flavors"] } }],
    }

    expect(resolveAppConfig(config, "acme-prod").services).toEqual({ mode: "allowlist", allow: ["images"] })
  })

  it("cascades multiple matching overrides in order, later wins per key", () => {
    const config: AuroraAppConfig = {
      services: { mode: "allowlist", allow: ["images"] },
      overrides: [
        { domain: /^acme-/, services: { disable: ["images"] } },
        { domain: /^acme-eu-/, services: { enable: ["images"] } },
      ],
    }

    expect(resolveAppConfig(config, "acme-eu-prod").services).toEqual({ mode: "allowlist", allow: ["images"] })
  })

  it("folds slot visibility the same way as services", () => {
    const config: AuroraAppConfig = {
      slots: { mode: "denylist", deny: ["projectsBanner"] },
      overrides: [{ domain: /^acme-/, slots: { enable: ["projectsBanner"], disable: ["serviceBanner"] } }],
    }

    expect(resolveAppConfig(config, "acme-prod").slots).toEqual({ mode: "denylist", deny: ["serviceBanner"] })
  })

  it("deep-merges serviceSettings and features without touching visibility", () => {
    const config: AuroraAppConfig = {
      serviceSettings: { images: { showAdvancedOptions: false } },
      features: { idp: "base", federation: false },
      overrides: [
        {
          domain: /^acme-/,
          serviceSettings: { images: { showAdvancedOptions: true }, flavors: {} },
          features: { federation: true },
        },
      ],
    }

    expect(resolveAppConfig(config, "acme-prod")).toEqual({
      serviceSettings: {
        images: { showAdvancedOptions: true },
        flavors: {},
      },
      features: { idp: "base", federation: true },
    })
  })

  it("sets service settings for a domain without changing default-open visibility", () => {
    const config: AuroraAppConfig = {
      overrides: [{ domain: /^acme-/, serviceSettings: { images: { showAdvancedOptions: true } } }],
    }

    expect(resolveAppConfig(config, "acme-prod")).toEqual({
      serviceSettings: { images: { showAdvancedOptions: true } },
    })
  })
})

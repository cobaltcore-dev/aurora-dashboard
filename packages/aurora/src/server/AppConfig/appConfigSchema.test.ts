import { describe, it, expect } from "vitest"
import { z } from "zod"
import { auroraAppConfigSchema } from "./appConfigSchema"

describe("auroraAppConfigSchema", () => {
  it("accepts a valid envelope with both postures, settings, and an override", () => {
    const schema = auroraAppConfigSchema()
    const config = {
      services: { mode: "allowlist", allow: ["ceph-containers", "images"] },
      slots: { mode: "denylist", deny: ["projectsBanner"] },
      serviceSettings: { images: { showAdvancedOptions: true } },
      slotSettings: { sideNavBanner: { text: "Hello" } },
      features: { termsAndConditionsUrl: "https://example.com/terms" },
      overrides: [
        {
          name: "acme",
          domain: "^acme-",
          services: { enable: ["flavors"], disable: ["images"] },
          slots: { enable: ["projectsBanner"] },
        },
      ],
    }
    expect(schema.parse(config)).toEqual(config)
  })

  it("accepts an empty config", () => {
    expect(auroraAppConfigSchema().parse({})).toEqual({})
  })

  it("rejects an allow list under denylist mode (discriminated union)", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ services: { mode: "denylist", allow: ["images"] } })).toThrow()
  })

  it("rejects both allow and deny present together", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ services: { mode: "allowlist", allow: ["images"], deny: ["pca"] } })).toThrow()
  })

  it("rejects an unknown slot name in slot visibility", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ slots: { mode: "denylist", deny: ["notASlot"] } })).toThrow()
  })

  it("rejects an unknown slot key in slotSettings", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ slotSettings: { notASlot: {} } })).toThrow()
  })

  it("rejects an unknown top-level key", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ slotz: {} })).toThrow()
  })

  it("accepts arbitrary flat keys in a service settings entry", () => {
    const schema = auroraAppConfigSchema()
    expect(schema.parse({ serviceSettings: { images: { showAdvancedOptions: true, maxItems: 50 } } })).toEqual({
      serviceSettings: { images: { showAdvancedOptions: true, maxItems: 50 } },
    })
  })

  it("rejects a mode on an override (overrides cannot flip posture)", () => {
    const schema = auroraAppConfigSchema()
    expect(() =>
      schema.parse({ overrides: [{ domain: "^acme-", services: { mode: "allowlist", allow: ["images"] } }] })
    ).toThrow()
  })

  it("rejects a domain pattern that is not a valid regex", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ overrides: [{ domain: "[" }] })).toThrow()
  })

  it("requires a domain on each override", () => {
    const schema = auroraAppConfigSchema()
    expect(() => schema.parse({ overrides: [{ features: {} }] })).toThrow()
  })

  it("validates consumer features with the supplied schema", () => {
    const schema = auroraAppConfigSchema(z.strictObject({ termsAndConditionsUrl: z.string().optional() }))
    expect(() => schema.parse({ features: { termsAndConditionsUrl: 42 } })).toThrow()
    expect(() => schema.parse({ features: { unknownFlag: true } })).toThrow()
    expect(schema.parse({ features: { termsAndConditionsUrl: "https://example.com" } })).toEqual({
      features: { termsAndConditionsUrl: "https://example.com" },
    })
  })
})

import { describe, it, expect } from "vitest"
import { gateSlots, resolveServiceVisibility } from "./appConfigGating"
import type { Slots } from "@/client/AuroraApp"

const noop = () => null
const slots: Slots = {
  logo: noop,
  sideNavBanner: noop,
  projectsBanner: noop,
}

describe("gateSlots", () => {
  it("returns slots unchanged when there is no visibility (default-open)", () => {
    expect(gateSlots(slots, undefined)).toBe(slots)
  })

  it("returns undefined when there are no slots to gate", () => {
    expect(gateSlots(undefined, { mode: "allowlist", allow: ["logo"] })).toBeUndefined()
  })

  it("keeps only allow-listed slots under allowlist mode", () => {
    const result = gateSlots(slots, { mode: "allowlist", allow: ["logo", "projectsBanner"] })
    expect(Object.keys(result ?? {})).toEqual(["logo", "projectsBanner"])
  })

  it("removes deny-listed slots under denylist mode", () => {
    const result = gateSlots(slots, { mode: "denylist", deny: ["sideNavBanner"] })
    expect(Object.keys(result ?? {})).toEqual(["logo", "projectsBanner"])
  })

  it("does not mutate the input slots object", () => {
    gateSlots(slots, { mode: "allowlist", allow: ["logo"] })
    expect(Object.keys(slots)).toEqual(["logo", "sideNavBanner", "projectsBanner"])
  })
})

describe("resolveServiceVisibility", () => {
  it("falls back to the legacy enabledServices prop when there is no visibility", () => {
    expect(resolveServiceVisibility(["images"], undefined)).toEqual({ enabledServices: ["images"] })
    expect(resolveServiceVisibility(undefined, undefined)).toEqual({ enabledServices: undefined })
  })

  it("uses the allow list under allowlist mode and ignores the legacy prop", () => {
    expect(resolveServiceVisibility(["flavors"], { mode: "allowlist", allow: ["images"] })).toEqual({
      enabledServices: ["images"],
    })
  })

  it("uses the deny list under denylist mode", () => {
    expect(resolveServiceVisibility(undefined, { mode: "denylist", deny: ["pca"] })).toEqual({
      deniedServices: ["pca"],
    })
  })
})

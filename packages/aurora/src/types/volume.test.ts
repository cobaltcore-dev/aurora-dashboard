import { describe, expect, it } from "vitest"
import { findCinderService } from "./volume"

describe("Cinder catalog discovery", () => {
  it.each(["volumev3", "block-storage", "volume"])("supports the %s service type without assuming its name", (type) => {
    expect(findCinderService([{ type, name: "deployment-specific-name" }])).toEqual({
      type,
      name: "deployment-specific-name",
    })
  })
  it("prefers the v3 registration over a legacy volume alias", () => {
    expect(
      findCinderService([
        { type: "volume", name: "cinder" },
        { type: "volumev3", name: "cinderv3" },
      ])?.type
    ).toBe("volumev3")
  })
  it("does not confuse object storage with block storage", () => {
    expect(findCinderService([{ type: "object-store", name: "swift" }])).toBeUndefined()
  })
})

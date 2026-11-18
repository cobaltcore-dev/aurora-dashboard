import { describe, expect, it } from "vitest"
import { resolveValueLabel } from "./valueLabels"

describe("resolveValueLabel", () => {
  it.each(["status", "power_state", "member_status"])("preserves raw %s labels for CSS styling", (filterName) => {
    const filter = { displayName: "Status", filterName, values: ["ACTIVE"] }
    expect(resolveValueLabel(filter, "ACTIVE")).toBe("ACTIVE")
    expect(filter.values).toEqual(["ACTIVE"])
  })

  it("preserves explicit labels and non-status values", () => {
    expect(
      resolveValueLabel(
        { displayName: "Status", filterName: "status", values: [], valueLabels: { ACTIVE: "Ready" } },
        "ACTIVE"
      )
    ).toBe("Ready")
    expect(resolveValueLabel({ displayName: "Zone", filterName: "az", values: [] }, "AZ-UPPER")).toBe("AZ-UPPER")
    expect(resolveValueLabel(undefined, "ACTIVE")).toBe("ACTIVE")
  })

  it("ignores inherited labels", () => {
    const filter = { displayName: "Type", filterName: "type", values: [], valueLabels: {} }
    expect(resolveValueLabel(filter, "__proto__")).toBe("__proto__")
    expect(resolveValueLabel(filter, "constructor")).toBe("constructor")
  })
})

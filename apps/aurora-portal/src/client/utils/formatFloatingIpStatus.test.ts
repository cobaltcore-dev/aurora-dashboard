import { describe, it, expect } from "vitest"
import { formatFloatingIpStatus } from "./formatFloatingIpStatus"

describe("formatFloatingIpStatus", () => {
  it("converts ACTIVE to Active", () => {
    expect(formatFloatingIpStatus("ACTIVE")).toBe("Active")
  })

  it("converts DOWN to Down", () => {
    expect(formatFloatingIpStatus("DOWN")).toBe("Down")
  })

  it("converts ERROR to Error", () => {
    expect(formatFloatingIpStatus("ERROR")).toBe("Error")
  })

  it("handles all status values correctly", () => {
    const statuses: Array<["ACTIVE" | "DOWN" | "ERROR", string]> = [
      ["ACTIVE", "Active"],
      ["DOWN", "Down"],
      ["ERROR", "Error"],
    ]

    statuses.forEach(([input, expected]) => {
      expect(formatFloatingIpStatus(input)).toBe(expected)
    })
  })
})

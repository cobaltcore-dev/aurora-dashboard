import { describe, expect, it } from "vitest"
import { MANILA_API_VERSION, MANILA_SERVICE_NAME, MANILA_SERVICE_TYPE, hasManilaService } from "./sharedFileSystem"

describe("hasManilaService", () => {
  it("returns true when both type and name match exactly", () => {
    const services = [
      { type: "identity", name: "keystone" },
      { type: MANILA_SERVICE_TYPE, name: MANILA_SERVICE_NAME },
      { type: "compute", name: "nova" },
    ]
    expect(hasManilaService(services)).toBe(true)
  })

  it("returns false when type matches but name does not", () => {
    const services = [{ type: "sharev2", name: "manila" }]
    expect(hasManilaService(services)).toBe(false)
  })

  it("returns false when name matches but type does not", () => {
    const services = [{ type: "share", name: "manilav2" }]
    expect(hasManilaService(services)).toBe(false)
  })

  it("returns false for an empty list", () => {
    expect(hasManilaService([])).toBe(false)
  })

  it("returns false when neither type nor name match", () => {
    const services = [
      { type: "identity", name: "keystone" },
      { type: "compute", name: "nova" },
    ]
    expect(hasManilaService(services)).toBe(false)
  })

  it("pins the Manila microversion to 2.65", () => {
    expect(MANILA_API_VERSION).toBe("2.65")
  })
})

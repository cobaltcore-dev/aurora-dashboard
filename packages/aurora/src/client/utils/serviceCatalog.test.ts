import { describe, it, expect } from "vitest"
import { hasServiceByName } from "./serviceCatalog"

describe("hasServiceByName", () => {
  it("finds the name under its expected catalog type", () => {
    expect(hasServiceByName({ "object-store": { swift: true } }, "swift")).toBe(true)
  })

  it("finds the name under a catalog type that does not match the service name (Ceph's real-world case)", () => {
    expect(hasServiceByName({ "object-store-ceph": { ceph: true } }, "ceph")).toBe(true)
  })

  it("finds the name under any other catalog type", () => {
    expect(hasServiceByName({ "some-other-type": { ceph: true } }, "ceph")).toBe(true)
  })

  it("returns false for an empty index", () => {
    expect(hasServiceByName({}, "ceph")).toBe(false)
  })

  it("returns false when the name is missing entirely", () => {
    expect(hasServiceByName({ "object-store": { swift: true } }, "ceph")).toBe(false)
  })

  it("returns false when the name is present only as a catalog type, not as a service name", () => {
    expect(hasServiceByName({ ceph: { rgw: true } }, "ceph")).toBe(false)
  })
})

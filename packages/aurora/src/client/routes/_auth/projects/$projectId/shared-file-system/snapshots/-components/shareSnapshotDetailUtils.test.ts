import { describe, it, expect } from "vitest"
import { getShareSnapshotDisplayName, getShareSnapshotProtocolLabel } from "./shareSnapshotDetailUtils"

describe("getShareSnapshotDisplayName", () => {
  it("returns the name when present", () => {
    expect(getShareSnapshotDisplayName({ id: "snap-123", name: "my-snapshot" })).toBe("my-snapshot")
  })

  it("returns the ID when name is null", () => {
    expect(getShareSnapshotDisplayName({ id: "snap-123", name: null })).toBe("snap-123")
  })

  it("returns the ID when name is an empty string", () => {
    expect(getShareSnapshotDisplayName({ id: "snap-123", name: "" })).toBe("snap-123")
  })

  it("returns the ID when name is whitespace", () => {
    expect(getShareSnapshotDisplayName({ id: "snap-123", name: "   " })).toBe("snap-123")
  })
})

describe("getShareSnapshotProtocolLabel", () => {
  it("returns CephFS for cephfs", () => {
    expect(getShareSnapshotProtocolLabel("cephfs")).toBe("CephFS")
  })

  it("returns NFS for nfs", () => {
    expect(getShareSnapshotProtocolLabel("nfs")).toBe("NFS")
  })

  it("returns NFS for NFS (uppercase)", () => {
    expect(getShareSnapshotProtocolLabel("NFS")).toBe("NFS")
  })

  it("returns the raw trimmed value for an unknown protocol", () => {
    expect(getShareSnapshotProtocolLabel("weirdfs")).toBe("weirdfs")
  })

  it("returns undefined for null", () => {
    expect(getShareSnapshotProtocolLabel(null)).toBeUndefined()
  })

  it("returns undefined for undefined", () => {
    expect(getShareSnapshotProtocolLabel(undefined)).toBeUndefined()
  })

  it("returns undefined for an empty string", () => {
    expect(getShareSnapshotProtocolLabel("")).toBeUndefined()
  })

  it("returns undefined for whitespace", () => {
    expect(getShareSnapshotProtocolLabel("   ")).toBeUndefined()
  })
})

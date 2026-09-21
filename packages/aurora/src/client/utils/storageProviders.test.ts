import { describe, it, expect } from "vitest"
import { isStorageProvider, asStorageProvider, storageTypeFor, STORAGE_TYPE_BY_PROVIDER } from "./storageProviders"

describe("isStorageProvider", () => {
  it.each(["swift", "ceph"])("returns true for %s", (value) => {
    expect(isStorageProvider(value)).toBe(true)
  })

  it.each(["", "containers", "SWIFT", "__proto__", "constructor", "toString", undefined, null, 123])(
    "returns false for %s",
    (value) => {
      expect(isStorageProvider(value)).toBe(false)
    }
  )
})

describe("asStorageProvider", () => {
  it("returns the value itself when it is a valid provider", () => {
    expect(asStorageProvider("ceph", "swift")).toBe("ceph")
  })

  it("returns the fallback when the value is not a valid provider", () => {
    expect(asStorageProvider("nope", "swift")).toBe("swift")
    expect(asStorageProvider(undefined, "ceph")).toBe("ceph")
  })
})

describe("storageTypeFor", () => {
  it("round-trips swift -> containers", () => {
    expect(storageTypeFor("swift")).toBe(STORAGE_TYPE_BY_PROVIDER.swift)
    expect(storageTypeFor("swift")).toBe("containers")
  })

  it("round-trips ceph -> buckets", () => {
    expect(storageTypeFor("ceph")).toBe(STORAGE_TYPE_BY_PROVIDER.ceph)
    expect(storageTypeFor("ceph")).toBe("buckets")
  })
})

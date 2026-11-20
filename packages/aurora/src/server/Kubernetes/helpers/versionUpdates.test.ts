import { describe, it, expect } from "vitest"
import { parseSemver, semverGt, semverDiff, sortVersions, calculateAvailableUpdates } from "./versionUpdates"

describe("parseSemver", () => {
  it("parses valid semver", () => {
    expect(parseSemver("1.30.2")).toEqual({ major: 1, minor: 30, patch: 2 })
  })

  it("returns null for invalid semver", () => {
    expect(parseSemver("v1.30")).toBeNull()
    expect(parseSemver("not-a-version")).toBeNull()
  })
})

describe("semverGt", () => {
  it("compares by major version", () => {
    expect(semverGt({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 99, patch: 99 })).toBe(true)
    expect(semverGt({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBe(false)
  })

  it("compares by minor version when major is equal", () => {
    expect(semverGt({ major: 1, minor: 31, patch: 0 }, { major: 1, minor: 30, patch: 99 })).toBe(true)
  })

  it("compares by patch version when major and minor are equal", () => {
    expect(semverGt({ major: 1, minor: 30, patch: 5 }, { major: 1, minor: 30, patch: 2 })).toBe(true)
  })

  it("returns false for equal versions", () => {
    expect(semverGt({ major: 1, minor: 30, patch: 2 }, { major: 1, minor: 30, patch: 2 })).toBe(false)
  })
})

describe("semverDiff", () => {
  it("returns major for major difference", () => {
    expect(semverDiff({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 30, patch: 2 })).toBe("major")
  })

  it("returns minor for minor difference", () => {
    expect(semverDiff({ major: 1, minor: 31, patch: 0 }, { major: 1, minor: 30, patch: 2 })).toBe("minor")
  })

  it("returns patch for patch difference", () => {
    expect(semverDiff({ major: 1, minor: 30, patch: 5 }, { major: 1, minor: 30, patch: 2 })).toBe("patch")
  })
})

describe("sortVersions", () => {
  it("sorts versions descending", () => {
    expect(sortVersions(["1.30.2", "1.30.5", "1.31.1", "2.0.0", "1.29.9"])).toEqual([
      "2.0.0",
      "1.31.1",
      "1.30.5",
      "1.30.2",
      "1.29.9",
    ])
  })
})

describe("calculateAvailableUpdates", () => {
  it("groups updates by semver difference", () => {
    const result = calculateAvailableUpdates("1.30.2", ["1.30.5", "1.30.3", "1.31.1", "2.0.0", "1.29.9"])
    expect(result).toEqual({
      patch: ["1.30.5", "1.30.3"],
      minor: ["1.31.1"],
      major: ["2.0.0"],
    })
  })

  it("returns null when current version is undefined", () => {
    expect(calculateAvailableUpdates(undefined, ["1.30.5"])).toBeNull()
  })

  it("returns null when available versions are undefined", () => {
    expect(calculateAvailableUpdates("1.30.2", undefined)).toBeNull()
  })

  it("returns null when available versions are empty", () => {
    expect(calculateAvailableUpdates("1.30.2", [])).toBeNull()
  })

  it("excludes older versions", () => {
    const result = calculateAvailableUpdates("1.30.2", ["1.29.9", "1.30.1"])
    expect(result).toEqual({
      patch: [],
      minor: [],
      major: [],
    })
  })
})

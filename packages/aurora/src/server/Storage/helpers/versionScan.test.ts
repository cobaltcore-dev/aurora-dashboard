import { describe, it, expect } from "vitest"
import { folderPrefixOf, isFolderCovered, longestCommonPrefix } from "./versionScan"

describe("folderPrefixOf", () => {
  it("attributes the folder marker itself", () => {
    expect(folderPrefixOf("p/foo/", "p/")).toBe("p/foo/")
  })

  it("attributes a nested object to its direct-child folder", () => {
    expect(folderPrefixOf("p/foo/a/b.txt", "p/")).toBe("p/foo/")
  })

  it("returns undefined for a loose object that merely shares a name prefix", () => {
    expect(folderPrefixOf("p/foobar", "p/")).toBe(undefined)
  })

  it("returns undefined for a key outside the scanned prefix", () => {
    expect(folderPrefixOf("other/foo/a.txt", "p/")).toBe(undefined)
  })

  it("returns undefined for a loose object directly at the current level", () => {
    expect(folderPrefixOf("p/loose.txt", "p/")).toBe(undefined)
  })

  it("works with an empty prefix (root scan)", () => {
    expect(folderPrefixOf("folder1/a.txt", "")).toBe("folder1/")
    expect(folderPrefixOf("loose.txt", "")).toBe(undefined)
  })
})

describe("isFolderCovered", () => {
  it("is fully covered when the scan finished (no stop key)", () => {
    expect(isFolderCovered("a/", undefined)).toBe(true)
  })

  it("is covered when the scan stopped strictly after the folder's whole range", () => {
    expect(isFolderCovered("a/", "m/x")).toBe(true)
  })

  it("is not covered when the scan stopped before the folder lexicographically", () => {
    expect(isFolderCovered("z/", "m/x")).toBe(false)
  })

  it("is not covered when the scan stopped inside the folder's own range", () => {
    expect(isFolderCovered("m/", "m/x")).toBe(false)
  })
})

describe("longestCommonPrefix", () => {
  it("returns the shared parent for folders under the same parent", () => {
    expect(longestCommonPrefix(["p/foo/", "p/bar/"])).toBe("p/")
  })

  it("returns an empty string when folders diverge before any slash", () => {
    expect(longestCommonPrefix(["folder1/", "folder2/"])).toBe("")
  })

  it("returns an empty string for an empty array", () => {
    expect(longestCommonPrefix([])).toBe("")
  })

  it("climbs to the parent for a single folder, which is its own common prefix", () => {
    // Returning "p/foo/" would make the scan unable to attribute a single key to
    // "p/foo/" - folderPrefixOf only ever yields direct children of the scan
    // prefix - so every folder came back "clean, fully scanned".
    expect(longestCommonPrefix(["p/foo/"])).toBe("p/")
  })

  it("climbs when the shallowest folder is the common prefix of the set", () => {
    expect(longestCommonPrefix(["a/b/", "a/b/c/"])).toBe("a/")
  })

  it("climbs to the bucket root for a single top-level folder", () => {
    expect(longestCommonPrefix(["foo/"])).toBe("")
  })

  it("does not climb when no folder equals the common prefix", () => {
    expect(longestCommonPrefix(["p/foo/", "p/foobar/"])).toBe("p/")
  })
})

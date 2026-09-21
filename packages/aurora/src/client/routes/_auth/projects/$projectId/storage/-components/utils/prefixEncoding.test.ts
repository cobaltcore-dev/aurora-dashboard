import { describe, it, expect } from "vitest"
import { encodePrefix, decodePrefix } from "./prefixEncoding"

describe("prefixEncoding", () => {
  it("round-trips a folder path", () => {
    expect(encodePrefix("images/")).toBe("aW1hZ2VzLw==")
    expect(decodePrefix("aW1hZ2VzLw==")).toBe("images/")
  })

  it("round-trips nested paths and non-ASCII names", () => {
    for (const prefix of ["images/2024/raw/", "фото/лето/", "a b/c+d/e%f/"]) {
      expect(decodePrefix(encodePrefix(prefix))).toBe(prefix)
    }
  })

  it("treats a missing prefix as the container root", () => {
    expect(decodePrefix(undefined)).toBe("")
    expect(decodePrefix("")).toBe("")
  })

  // A hand-edited URL must not be able to push a garbage prefix into the listing query:
  // falling back to the root shows the container instead of an empty phantom folder.
  it("falls back to the root on input that is not valid base64", () => {
    expect(decodePrefix("not base64!!")).toBe("")
  })

  // Decoding is `fatal`, so bytes that are valid base64 but not valid UTF-8 are rejected
  // rather than silently turned into U+FFFD replacement characters — those would travel on
  // as a real prefix and list nothing.
  it("falls back to the root on valid base64 that is not valid UTF-8", () => {
    const invalidUtf8 = btoa(String.fromCodePoint(0xff, 0xfe))
    expect(decodePrefix(invalidUtf8)).toBe("")
  })
})

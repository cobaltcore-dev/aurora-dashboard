import { describe, it, expect } from "vitest"
import { formatBulkDeleteErrors } from "./bulkDeleteErrors"
import type { DeleteObjectError } from "@/server/Storage/types/ceph"

describe("formatBulkDeleteErrors", () => {
  it("formats an error with key, versionId, code, and message", () => {
    const errors: DeleteObjectError[] = [
      { key: "a.txt", versionId: "v1", code: "AccessDenied", message: "Access Denied" },
    ]
    expect(formatBulkDeleteErrors(errors)).toBe("a.txt (v1): AccessDenied: Access Denied")
  })

  it("formats an error with key and code, without versionId and message", () => {
    const errors: DeleteObjectError[] = [{ key: "a.txt", code: "AccessDenied" }]
    expect(formatBulkDeleteErrors(errors)).toBe("a.txt: AccessDenied")
  })

  it("formats an error with key and versionId, without code and message", () => {
    const errors: DeleteObjectError[] = [{ key: "a.txt", versionId: "v1" }]
    expect(formatBulkDeleteErrors(errors)).toBe("a.txt (v1)")
  })

  it("joins multiple errors with semicolon and space", () => {
    const errors: DeleteObjectError[] = [
      { key: "a.txt", versionId: "v1", code: "AccessDenied", message: "Access Denied" },
      { key: "b.txt", versionId: "v2", code: "ObjectLocked", message: "Object is WORM protected" },
    ]
    expect(formatBulkDeleteErrors(errors)).toBe(
      "a.txt (v1): AccessDenied: Access Denied; b.txt (v2): ObjectLocked: Object is WORM protected"
    )
  })

  it("returns empty string for empty array", () => {
    expect(formatBulkDeleteErrors([])).toBe("")
  })
})

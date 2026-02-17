import { describe, it, expect } from "vitest"
import { appendQueryParamsFromObject } from "./queryParams"

describe("appendQueryParamsFromObject", () => {
  it("skips undefined and null", () => {
    const q = new URLSearchParams()
    appendQueryParamsFromObject(q, { a: undefined, b: null, c: "ok" })
    expect(q.toString()).toBe("c=ok")
  })

  it("appends string and number as-is", () => {
    const q = new URLSearchParams()
    appendQueryParamsFromObject(q, { name: "foo", limit: 10 })
    expect(q.get("name")).toBe("foo")
    expect(q.get("limit")).toBe("10")
  })

  it("serializes boolean to true/false", () => {
    const q = new URLSearchParams()
    appendQueryParamsFromObject(q, { shared: true, page_reverse: false })
    expect(q.get("shared")).toBe("true")
    expect(q.get("page_reverse")).toBe("false")
  })

  it("uses keyMap for param names", () => {
    const q = new URLSearchParams()
    appendQueryParamsFromObject(
      q,
      { tags_any: "x", not_tags: "y" },
      {
        keyMap: { tags_any: "tags-any", not_tags: "not-tags" },
      }
    )
    expect(q.get("tags-any")).toBe("x")
    expect(q.get("not-tags")).toBe("y")
    expect(q.has("tags_any")).toBe(false)
    expect(q.has("not_tags")).toBe(false)
  })

  it("matches Neutron list security groups usage", () => {
    const q = new URLSearchParams()
    const input = {
      limit: 20,
      sort_key: "name",
      sort_dir: "asc" as const,
      name: "default",
      shared: false,
      tags_any: "web",
      not_tags: "internal",
      marker: undefined,
      description: undefined,
    }
    appendQueryParamsFromObject(q, input, {
      keyMap: { tags_any: "tags-any", not_tags: "not-tags", not_tags_any: "not-tags-any" },
    })
    expect(q.get("limit")).toBe("20")
    expect(q.get("sort_key")).toBe("name")
    expect(q.get("sort_dir")).toBe("asc")
    expect(q.get("name")).toBe("default")
    expect(q.get("shared")).toBe("false")
    expect(q.get("tags-any")).toBe("web")
    expect(q.get("not-tags")).toBe("internal")
    expect(q.has("marker")).toBe(false)
    expect(q.has("description")).toBe(false)
  })
})

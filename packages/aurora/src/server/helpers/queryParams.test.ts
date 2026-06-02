import { describe, it, expect } from "vitest"
import { appendQueryParamsFromObject } from "./queryParams"

describe("appendQueryParamsFromObject", () => {
  it("skips undefined and null", () => {
    const input = { a: undefined, b: null, c: "ok" }
    const q = appendQueryParamsFromObject(input)
    expect(q.toString()).toBe("c=ok")
  })

  it("appends string and number as-is", () => {
    const input = { name: "foo", limit: 10 }
    const q = appendQueryParamsFromObject(input)
    expect(q.get("name")).toBe("foo")
    expect(q.get("limit")).toBe("10")
  })

  it("serializes boolean to true/false", () => {
    const input = { shared: true, page_reverse: false }
    const q = appendQueryParamsFromObject(input)
    expect(q.get("shared")).toBe("true")
    expect(q.get("page_reverse")).toBe("false")
  })

  it("uses keyMap for param names", () => {
    const input = { tags_any: "x", not_tags: "y" }
    const q = appendQueryParamsFromObject(input, {
      keyMap: { tags_any: "tags-any", not_tags: "not-tags" },
    })
    expect(q.get("tags-any")).toBe("x")
    expect(q.get("not-tags")).toBe("y")
    expect(q.has("tags_any")).toBe(false)
    expect(q.has("not_tags")).toBe(false)
  })

  it("matches Neutron list security groups usage", () => {
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
    const q = appendQueryParamsFromObject(input, {
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

  it("appends each string array item as a separate entry with the same key", () => {
    const input = { fields: ["id", "name", "fixed_ips"] }
    const q = appendQueryParamsFromObject(input)
    expect(q.getAll("fields")).toEqual(["id", "name", "fixed_ips"])
  })

  it("appends each number array item as a separate entry", () => {
    const input = { ids: [1, 2, 3] }
    const q = appendQueryParamsFromObject(input)
    expect(q.getAll("ids")).toEqual(["1", "2", "3"])
  })

  it("appends mixed primitive array items, skipping non-primitives", () => {
    const input = { values: ["a", 2, true, null, undefined, { x: 1 }] as unknown[] }
    const q = appendQueryParamsFromObject(input as Record<string, unknown>)
    expect(q.getAll("values")).toEqual(["a", "2", "true"])
  })

  it("appends empty array as no entries", () => {
    const input = { fields: [] as string[] }
    const q = appendQueryParamsFromObject(input)
    expect(q.has("fields")).toBe(false)
  })

  it("respects keyMap for array params", () => {
    const input = { not_tags: ["internal", "deprecated"] }
    const q = appendQueryParamsFromObject(input, { keyMap: { not_tags: "not-tags" } })
    expect(q.getAll("not-tags")).toEqual(["internal", "deprecated"])
    expect(q.has("not_tags")).toBe(false)
  })

  it("matches port fields filter usage", () => {
    const input = {
      project_id: "proj-1",
      status: "ACTIVE",
      admin_state_up: true,
      fields: ["id", "name", "fixed_ips"],
    }
    const q = appendQueryParamsFromObject(input)
    expect(q.get("project_id")).toBe("proj-1")
    expect(q.get("status")).toBe("ACTIVE")
    expect(q.get("admin_state_up")).toBe("true")
    expect(q.getAll("fields")).toEqual(["id", "name", "fixed_ips"])
  })
})

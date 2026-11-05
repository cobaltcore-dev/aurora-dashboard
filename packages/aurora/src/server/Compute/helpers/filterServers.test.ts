import { describe, it, expect } from "vitest"
import type { Server } from "../types/server"
import { filterServers, sortServers } from "./filterServers"

const makeServer = (overrides: Partial<Server> = {}): Server =>
  ({
    id: "srv-1",
    name: "web-1",
    status: "ACTIVE",
    ...overrides,
  }) as Server

const servers = [
  makeServer({
    id: "id-aaa",
    name: "alpha",
    status: "ACTIVE",
    "OS-EXT-AZ:availability_zone": "az-1",
    flavor: { original_name: "m1.small" },
    image: { id: "img-1" },
    key_name: "key-a",
    locked: false,
  }),
  makeServer({
    id: "id-bbb",
    name: "bravo",
    status: "ERROR",
    "OS-EXT-AZ:availability_zone": "az-2",
    flavor: { original_name: "m1.large" },
    image: "img-2",
    key_name: "key-b",
    locked: true,
  }),
  makeServer({
    id: "id-ccc",
    name: "charlie",
    status: "SHUTOFF",
    "OS-EXT-AZ:availability_zone": "az-1",
    flavor: { original_name: "m1.small" },
    image: { id: "img-1" },
    key_name: "key-a",
    locked: false,
  }),
]

describe("filterServers", () => {
  it("searches by name and id (substring)", () => {
    expect(filterServers(servers, { name: "bravo" }).map((s) => s.id)).toEqual(["id-bbb"])
    expect(filterServers(servers, { name: "id-ccc" }).map((s) => s.id)).toEqual(["id-ccc"])
  })

  it("filters by single-value status and az", () => {
    expect(filterServers(servers, { status: "ACTIVE" }).map((s) => s.id)).toEqual(["id-aaa"])
    expect(filterServers(servers, { availability_zone: "az-1" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
  })

  it("supports multi-value 'in:' status", () => {
    expect(filterServers(servers, { status: "in:ACTIVE,ERROR" }).map((s) => s.id)).toEqual(["id-aaa", "id-bbb"])
  })

  it("filters by flavor, image (object or string), and key name", () => {
    expect(filterServers(servers, { flavor: "m1.small" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
    expect(filterServers(servers, { image: "img-1" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
    expect(filterServers(servers, { image: "img-2" }).map((s) => s.id)).toEqual(["id-bbb"])
    expect(filterServers(servers, { key_name: "key-b" }).map((s) => s.id)).toEqual(["id-bbb"])
  })

  it("filters by locked true/false", () => {
    expect(filterServers(servers, { locked: "true" }).map((s) => s.id)).toEqual(["id-bbb"])
    expect(filterServers(servers, { locked: "false" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
  })

  it("combines filters (AND)", () => {
    expect(
      filterServers(servers, { status: "in:ACTIVE,SHUTOFF", flavor: "m1.small", availability_zone: "az-1" }).map(
        (s) => s.id
      )
    ).toEqual(["id-aaa", "id-ccc"])
  })
})

describe("sortServers", () => {
  it("sorts by name ascending and descending", () => {
    expect(sortServers(servers, "name:asc").map((s) => s.name)).toEqual(["alpha", "bravo", "charlie"])
    expect(sortServers(servers, "name:desc").map((s) => s.name)).toEqual(["charlie", "bravo", "alpha"])
  })

  it("sorts by flavor and availability_zone", () => {
    expect(sortServers(servers, "flavor:asc").map((s) => s.flavor?.original_name)).toEqual([
      "m1.large",
      "m1.small",
      "m1.small",
    ])
  })

  it("returns the input unchanged when no sort is given", () => {
    expect(sortServers(servers, undefined).map((s) => s.id)).toEqual(["id-aaa", "id-bbb", "id-ccc"])
  })

  it("does not mutate the input array", () => {
    const input = [...servers]
    sortServers(input, "name:desc")
    expect(input.map((s) => s.id)).toEqual(["id-aaa", "id-bbb", "id-ccc"])
  })
})

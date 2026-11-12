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
    "OS-EXT-STS:power_state": 1,
    created: "2026-01-01T00:00:00Z",
    "OS-EXT-AZ:availability_zone": "az-1",
    flavor: { original_name: "m1.small" },
    image: { id: "img-1" },
    key_name: "key-a",
    locked: false,
    addresses: { private: [{ addr: "10.0.0.5", version: 4 }] },
  }),
  makeServer({
    id: "id-bbb",
    name: "bravo",
    "OS-EXT-STS:power_state": 4,
    created: "2026-02-02T00:00:00Z",
    "OS-EXT-AZ:availability_zone": "az-2",
    flavor: { original_name: "m1.large" },
    image: "img-2",
    key_name: "key-b",
    locked: true,
    addresses: { private: [{ addr: "10.0.0.6", version: 4 }] },
  }),
  makeServer({
    id: "id-ccc",
    name: "charlie",
    "OS-EXT-STS:power_state": 7,
    created: "2026-03-03T00:00:00Z",
    "OS-EXT-AZ:availability_zone": "az-1",
    flavor: { original_name: "m1.small" },
    image: { id: "img-1" },
    key_name: "key-a",
    locked: false,
    addresses: { private: [{ addr: "10.0.0.7", version: 4 }] },
  }),
]

describe("filterServers", () => {
  it("searches across name, id, flavor, image, created and IP (everything but power state/az)", () => {
    expect(filterServers(servers, { name: "bravo" }).map((s) => s.id)).toEqual(["id-bbb"])
    expect(filterServers(servers, { name: "id-ccc" }).map((s) => s.id)).toEqual(["id-ccc"])
    // Flavor name.
    expect(filterServers(servers, { name: "large" }).map((s) => s.id)).toEqual(["id-bbb"])
    // Image id, whether returned as an object or a bare string.
    expect(filterServers(servers, { name: "img-1" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
    expect(filterServers(servers, { name: "img-2" }).map((s) => s.id)).toEqual(["id-bbb"])
    // IP address.
    expect(filterServers(servers, { name: "10.0.0.6" }).map((s) => s.id)).toEqual(["id-bbb"])
    // Created timestamp.
    expect(filterServers(servers, { name: "2026-03" }).map((s) => s.id)).toEqual(["id-ccc"])
  })

  it("filters by single-value power state and az", () => {
    expect(filterServers(servers, { power_state: "RUNNING" }).map((s) => s.id)).toEqual(["id-aaa"])
    expect(filterServers(servers, { availability_zone: "az-1" }).map((s) => s.id)).toEqual(["id-aaa", "id-ccc"])
  })

  it("supports multi-value 'in:' power state", () => {
    expect(filterServers(servers, { power_state: "in:RUNNING,SHUTDOWN" }).map((s) => s.id)).toEqual([
      "id-aaa",
      "id-bbb",
    ])
  })

  it("accepts sentence-case and mixed-case power-state labels alongside legacy uppercase URLs", () => {
    expect(filterServers(servers, { power_state: "Running" }).map((s) => s.id)).toEqual(["id-aaa"])
    expect(filterServers(servers, { power_state: "in:Running,sHuTdOwN" }).map((s) => s.id)).toEqual([
      "id-aaa",
      "id-bbb",
    ])
    expect(servers[0]["OS-EXT-STS:power_state"]).toBe(1)
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
      filterServers(servers, {
        power_state: "in:RUNNING,SUSPENDED",
        flavor: "m1.small",
        availability_zone: "az-1",
      }).map((s) => s.id)
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

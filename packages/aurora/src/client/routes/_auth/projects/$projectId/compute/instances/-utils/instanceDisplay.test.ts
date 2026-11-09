import { describe, it, expect } from "vitest"
import type { Server } from "@/server/Compute/types/server"
import {
  powerStateLabel,
  flavorName,
  imageId,
  rawImageId,
  instanceIps,
  availabilityZones,
  powerStateFacet,
  EMPTY_VALUE,
} from "./instanceDisplay"

const makeServer = (overrides: Partial<Server> = {}): Server =>
  ({
    id: "srv-1",
    name: "web-1",
    status: "ACTIVE",
    ...overrides,
  }) as Server

describe("powerStateLabel", () => {
  it("maps known power states", () => {
    expect(powerStateLabel(1)).toBe("RUNNING")
    expect(powerStateLabel(4)).toBe("SHUTDOWN")
    expect(powerStateLabel(0)).toBe("NOSTATE")
  })

  it("handles unknown and missing values", () => {
    expect(powerStateLabel(99)).toBe("UNKNOWN (99)")
    expect(powerStateLabel(undefined)).toBe("")
    expect(powerStateLabel(null)).toBe("")
  })
})

describe("field accessors", () => {
  it("flavorName uses original_name, else placeholder", () => {
    expect(flavorName(makeServer({ flavor: { original_name: "m1.small" } }))).toBe("m1.small")
    expect(flavorName(makeServer({ flavor: {} }))).toBe(EMPTY_VALUE)
    expect(flavorName(makeServer())).toBe(EMPTY_VALUE)
  })

  it("imageId handles object, string, and missing", () => {
    expect(imageId(makeServer({ image: { id: "img-9" } }))).toBe("img-9")
    expect(imageId(makeServer({ image: "img-str" }))).toBe("img-str")
    expect(imageId(makeServer({ image: "" }))).toBe(EMPTY_VALUE)
    expect(imageId(makeServer({ image: null }))).toBe(EMPTY_VALUE)
  })

  it("rawImageId returns the id or empty string (boot-from-volume)", () => {
    expect(rawImageId(makeServer({ image: { id: "img-9" } }))).toBe("img-9")
    expect(rawImageId(makeServer({ image: "img-str" }))).toBe("img-str")
    expect(rawImageId(makeServer({ image: "" }))).toBe("")
    expect(rawImageId(makeServer({ image: null }))).toBe("")
  })

  it("instanceIps flattens addresses across networks", () => {
    const server = makeServer({
      addresses: {
        private: [{ addr: "10.0.0.5" }, { addr: "10.0.0.6" }],
        public: [{ addr: "1.2.3.4" }],
      },
    })
    expect(instanceIps(server)).toEqual(["10.0.0.5", "10.0.0.6", "1.2.3.4"])
    expect(instanceIps(makeServer())).toEqual([])
  })
})

describe("facet collection", () => {
  const servers = [
    makeServer({
      id: "a",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-AZ:availability_zone": "az-2",
      flavor: { original_name: "m1.small" },
      image: { id: "img-2" },
      key_name: "key-b",
    }),
    makeServer({
      id: "b",
      "OS-EXT-STS:power_state": 4,
      "OS-EXT-AZ:availability_zone": "az-1",
      flavor: { original_name: "m1.large" },
      image: "img-1",
      key_name: "key-a",
    }),
    makeServer({
      id: "c",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-AZ:availability_zone": "az-1",
      flavor: { original_name: "m1.small" },
      image: { id: "img-1" },
      key_name: "key-a",
    }),
  ]

  it("availabilityZones returns a unique sorted list", () => {
    expect(availabilityZones(servers)).toEqual(["az-1", "az-2"])
  })

  it("powerStateFacet returns a unique sorted list of labels", () => {
    expect(powerStateFacet(servers)).toEqual(["RUNNING", "SHUTDOWN"])
  })
})

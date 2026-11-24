import { describe, it, expect } from "vitest"
import { filterAndSortVolumes, statusRank, volumeSearchSchema, cinderTimestamp, formatCinderDate } from "./list"
import { volumeSchema } from "@/server/Volume/types/volume"

const volumes = [
  volumeSchema.parse({
    id: "1",
    name: "Ubuntu",
    status: "available",
    size: 10,
    bootable: "false",
    volume_type: "fast",
    availability_zone: "az1",
  }),
  volumeSchema.parse({
    id: "2",
    name: "Database",
    status: "error_extending",
    size: 100,
    bootable: "true",
    volume_type: "slow",
    availability_zone: "az2",
  }),
  volumeSchema.parse({ id: "3", status: "future-state", size: 0 }),
]

describe("volume list transforms", () => {
  it("combines name/ID search and all four client-side filters", () => {
    expect(
      filterAndSortVolumes(volumes, {
        search: "ubuntu",
        status: "available",
        bootable: "false",
        volume_type: "fast",
        availability_zone: "az1",
      })
    ).toEqual([volumes[0]])
    expect(filterAndSortVolumes(volumes, { search: "2" })).toEqual([volumes[1]])
    expect(filterAndSortVolumes(volumes, { bootable: "false" })).toEqual([volumes[0]])
  })
  it("offers unknown statuses through the other bucket", () => {
    expect(filterAndSortVolumes(volumes, { status: "other" })).toEqual([volumes[2]])
  })
  it("sorts failure states first and reverses direction", () => {
    expect(filterAndSortVolumes(volumes, { sortBy: "status" }).map((volume) => volume.id)).toEqual(["2", "1", "3"])
    expect(
      filterAndSortVolumes(volumes, { sortBy: "status", sortDirection: "desc" }).map((volume) => volume.id)
    ).toEqual(["3", "1", "2"])
    expect(statusRank("error_future")).toBe(0)
    expect(statusRank("retyping")).toBeLessThan(statusRank("available"))
    expect(statusRank("backing-up", true)).toBeLessThan(statusRank("available", true))
  })
  it("sorts size numerically without mutating the query cache", () => {
    expect(filterAndSortVolumes(volumes, { sortBy: "size" }).map((volume) => volume.id)).toEqual(["3", "1", "2"])
    expect(volumes.map((volume) => volume.id)).toEqual(["1", "2", "3"])
  })
  it("drops invalid URL values without dropping valid search fields", () => {
    expect(
      volumeSearchSchema.parse({ search: "ubuntu", bootable: "maybe", sortBy: "unknown", status: "future-state" })
    ).toEqual({ search: "ubuntu", bootable: undefined, sortBy: undefined, status: "future-state" })
  })
  it("interprets unzoned Cinder dates as UTC and tolerates invalid dates", () => {
    expect(cinderTimestamp("2026-11-16T10:00:00.000000")).toBe(Date.parse("2026-11-16T10:00:00Z"))
    expect(cinderTimestamp("2026-11-16T12:00:00+02:00")).toBe(Date.parse("2026-11-16T10:00:00Z"))
    expect(formatCinderDate("invalid", "en")).toBe("- -")
  })
})

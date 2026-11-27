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
  const searchableVolume = volumeSchema.parse({
    id: "volume[data]",
    name: "Backup",
    description: "Nightly database copy",
    size: 73,
    encrypted: true,
    multiattach: false,
    snapshot_id: "source-snapshot",
    source_volid: "source-volume",
    created_at: "2026-11-25T10:00:00",
    updated_at: "2026-11-26T11:00:00",
    "os-vol-tenant-attr:tenant_id": "project-owner",
    metadata: { retention: "weekly" },
    attachments: [
      {
        attachment_id: "attach-record",
        server_id: "server-instance",
        device: "/dev/vdc",
        attached_at: "2026-11-27T12:00:00",
        volume_id: "attached-volume",
      },
    ],
    status: "available",
    volume_type: "fast",
    bootable: true,
    availability_zone: "az1",
  })

  it.each([
    "backup",
    "DATABASE",
    "73",
    "true",
    "false",
    "yes",
    "no",
    "source-snapshot",
    "source-volume",
    "2026-11-25",
    "2026-11-26",
    "project-owner",
    "retention",
    "weekly",
    "attach-record",
    "server-instance",
    "/dev/vdc",
    "2026-11-27",
    "attached-volume",
    "[",
  ])("searches non-filter volume data (%s)", (search) => {
    expect(filterAndSortVolumes([searchableVolume], { search })).toEqual([searchableVolume])
  })

  it.each(["available", "fast", "az1"])("leaves %s to dedicated filters", (search) => {
    expect(filterAndSortVolumes([searchableVolume], { search })).toEqual([])
  })

  it("does not include bootable in free-text search", () => {
    const volume = volumeSchema.parse({ id: "one", bootable: true })
    expect(filterAndSortVolumes([volume], { search: "true" })).toEqual([])
    expect(filterAndSortVolumes([volume], { bootable: "true" })).toEqual([volume])
  })

  it("combines expanded search with filters, preserves snapshot search, and matches literally", () => {
    expect(
      filterAndSortVolumes([searchableVolume], {
        search: " database ",
        status: "available",
        volume_type: "fast",
        availability_zone: "az1",
        bootable: "true",
      })
    ).toEqual([searchableVolume])
    expect(filterAndSortVolumes([searchableVolume], { search: "database", status: "in-use" })).toEqual([])
    expect(filterAndSortVolumes([searchableVolume], { search: ".*" })).toEqual([])
    expect(filterAndSortVolumes([searchableVolume], { search: "  " })).toEqual([searchableVolume])
    expect(filterAndSortVolumes([searchableVolume], { search: "database" }, true)).toEqual([])
    expect(filterAndSortVolumes([searchableVolume], { search: "backup" }, true)).toEqual([searchableVolume])
    expect(filterAndSortVolumes(volumes, { search: "undefined" })).toEqual([])
  })

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
  it.each([0, -1, 1.5, "invalid", "", Infinity])("drops invalid page values (%s) without dropping filters", (page) => {
    expect(volumeSearchSchema.parse({ page, search: "ubuntu" })).toEqual({ page: undefined, search: "ubuntu" })
  })
  it("accepts positive page numbers from the URL", () => {
    expect(volumeSearchSchema.parse({ page: "2" })).toEqual({ page: 2 })
    expect(volumeSearchSchema.parse({ page: 3 })).toEqual({ page: 3 })
  })
})

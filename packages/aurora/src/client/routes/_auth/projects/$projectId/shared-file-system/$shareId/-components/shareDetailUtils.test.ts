import { describe, expect, it } from "vitest"
import {
  DEFAULT_SHARE_DETAILS_TAB,
  getReplicaStateLabel,
  getReplicaStateRank,
  getShareDetailsTabs,
  getSnapshotStatusRank,
  isShareDetailsTab,
  sortExportLocations,
  sortShareReplicas,
  sortShareSnapshots,
} from "./shareDetailUtils"
import type { ShareExportLocation, ShareReplica } from "@/server/SharedFileSystem/types/share"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"

describe("shareDetailUtils", () => {
  describe("isShareDetailsTab", () => {
    it("returns true for valid tabs", () => {
      expect(isShareDetailsTab("export-locations")).toBe(true)
      expect(isShareDetailsTab("snapshots")).toBe(true)
      expect(isShareDetailsTab("replicas")).toBe(true)
    })

    it("returns false for invalid values", () => {
      expect(isShareDetailsTab("invalid")).toBe(false)
      expect(isShareDetailsTab("")).toBe(false)
      expect(isShareDetailsTab(null)).toBe(false)
      expect(isShareDetailsTab(undefined)).toBe(false)
      expect(isShareDetailsTab(123)).toBe(false)
    })
  })

  describe("getShareDetailsTabs", () => {
    it("returns export-locations and snapshots by default", () => {
      const tabs = getShareDetailsTabs({ has_replicas: false })
      expect(tabs).toEqual(["export-locations", "snapshots"])
    })

    it("includes replicas when has_replicas is true", () => {
      const tabs = getShareDetailsTabs({ has_replicas: true })
      expect(tabs).toEqual(["export-locations", "snapshots", "replicas"])
    })

    it("excludes replicas when has_replicas is undefined", () => {
      const tabs = getShareDetailsTabs({ has_replicas: undefined })
      expect(tabs).toEqual(["export-locations", "snapshots"])
    })

    it("excludes replicas when has_replicas is null", () => {
      const tabs = getShareDetailsTabs({ has_replicas: null })
      expect(tabs).toEqual(["export-locations", "snapshots"])
    })
  })

  describe("getSnapshotStatusRank", () => {
    it("ranks error states highest priority (0)", () => {
      expect(getSnapshotStatusRank("error")).toBe(0)
      expect(getSnapshotStatusRank("ERROR")).toBe(0)
      expect(getSnapshotStatusRank("error_deleting")).toBe(0)
      expect(getSnapshotStatusRank("manage_error")).toBe(0)
      expect(getSnapshotStatusRank("unmanage_error")).toBe(0)
    })

    it("ranks transitional states second priority (1)", () => {
      expect(getSnapshotStatusRank("creating")).toBe(1)
      expect(getSnapshotStatusRank("deleting")).toBe(1)
      expect(getSnapshotStatusRank("restoring")).toBe(1)
      expect(getSnapshotStatusRank("migrating")).toBe(1)
      expect(getSnapshotStatusRank("migrating_to")).toBe(1)
      expect(getSnapshotStatusRank("manage_starting")).toBe(1)
      expect(getSnapshotStatusRank("unmanage_starting")).toBe(1)
    })

    it("ranks available as third priority (2)", () => {
      expect(getSnapshotStatusRank("available")).toBe(2)
      expect(getSnapshotStatusRank("AVAILABLE")).toBe(2)
    })

    it("ranks unknown and missing as lowest priority", () => {
      expect(getSnapshotStatusRank("unknown")).toBe(3)
      expect(getSnapshotStatusRank(null)).toBe(3)
      expect(getSnapshotStatusRank(undefined)).toBe(3)
      expect(getSnapshotStatusRank("")).toBe(3)
    })
  })

  describe("getReplicaStateRank", () => {
    it("ranks error highest priority (0)", () => {
      expect(getReplicaStateRank("error")).toBe(0)
      expect(getReplicaStateRank("ERROR")).toBe(0)
    })

    it("ranks out_of_sync second priority (1)", () => {
      expect(getReplicaStateRank("out_of_sync")).toBe(1)
      expect(getReplicaStateRank("OUT_OF_SYNC")).toBe(1)
    })

    it("ranks in_sync third priority (2)", () => {
      expect(getReplicaStateRank("in_sync")).toBe(2)
      expect(getReplicaStateRank("IN_SYNC")).toBe(2)
    })

    it("ranks active fourth priority (3)", () => {
      expect(getReplicaStateRank("active")).toBe(3)
      expect(getReplicaStateRank("ACTIVE")).toBe(3)
    })

    it("ranks unknown and missing as lowest priority (4)", () => {
      expect(getReplicaStateRank("unknown")).toBe(4)
      expect(getReplicaStateRank(null)).toBe(4)
      expect(getReplicaStateRank(undefined)).toBe(4)
      expect(getReplicaStateRank("")).toBe(4)
    })
  })

  describe("sortShareSnapshots", () => {
    const createSnapshot = (overrides: Partial<ShareSnapshot>): ShareSnapshot => ({
      id: "snapshot-id",
      status: null,
      name: null,
      created_at: null,
      updated_at: null,
      description: null,
      size: null,
      share_id: null,
      share_proto: null,
      share_size: null,
      project_id: null,
      ...overrides,
    })

    it("sorts by status rank first", () => {
      const snapshots = [
        createSnapshot({ id: "1", status: "available" }),
        createSnapshot({ id: "2", status: "error" }),
        createSnapshot({ id: "3", status: "creating" }),
      ]

      const sorted = sortShareSnapshots(snapshots)
      expect(sorted.map((s) => s.id)).toEqual(["2", "3", "1"])
    })

    it("sorts by name within same status rank", () => {
      const snapshots = [
        createSnapshot({ id: "1", name: "snapshot-b", status: "available" }),
        createSnapshot({ id: "2", name: "snapshot-a", status: "available" }),
        createSnapshot({ id: "3", name: "snapshot-c", status: "available" }),
      ]

      const sorted = sortShareSnapshots(snapshots)
      expect(sorted.map((s) => s.name)).toEqual(["snapshot-a", "snapshot-b", "snapshot-c"])
    })

    it("uses ID as fallback when name is missing", () => {
      const snapshots = [
        createSnapshot({ id: "snapshot-c", name: null, status: "available" }),
        createSnapshot({ id: "snapshot-a", name: null, status: "available" }),
        createSnapshot({ id: "snapshot-b", name: null, status: "available" }),
      ]

      const sorted = sortShareSnapshots(snapshots)
      expect(sorted.map((s) => s.id)).toEqual(["snapshot-a", "snapshot-b", "snapshot-c"])
    })

    it("does not mutate input array", () => {
      const snapshots = [createSnapshot({ id: "2", status: "error" }), createSnapshot({ id: "1", status: "available" })]
      const original = [...snapshots]

      sortShareSnapshots(snapshots)
      expect(snapshots).toEqual(original)
    })

    it("handles numeric name sorting", () => {
      const snapshots = [
        createSnapshot({ id: "1", name: "snapshot-10", status: "available" }),
        createSnapshot({ id: "2", name: "snapshot-2", status: "available" }),
        createSnapshot({ id: "3", name: "snapshot-20", status: "available" }),
      ]

      const sorted = sortShareSnapshots(snapshots)
      expect(sorted.map((s) => s.name)).toEqual(["snapshot-2", "snapshot-10", "snapshot-20"])
    })
  })

  describe("sortShareReplicas", () => {
    const createReplica = (overrides: Partial<ShareReplica>): ShareReplica => ({
      id: "replica-id",
      status: null,
      replica_state: null,
      availability_zone: null,
      created_at: null,
      updated_at: null,
      share_id: null,
      ...overrides,
    })

    it("sorts by replica state rank first", () => {
      const replicas = [
        createReplica({ id: "1", replica_state: "active" }),
        createReplica({ id: "2", replica_state: "error" }),
        createReplica({ id: "3", replica_state: "in_sync" }),
      ]

      const sorted = sortShareReplicas(replicas)
      expect(sorted.map((r) => r.id)).toEqual(["2", "3", "1"])
    })

    it("sorts by ID within same replica state rank", () => {
      const replicas = [
        createReplica({ id: "replica-c", replica_state: "active" }),
        createReplica({ id: "replica-a", replica_state: "active" }),
        createReplica({ id: "replica-b", replica_state: "active" }),
      ]

      const sorted = sortShareReplicas(replicas)
      expect(sorted.map((r) => r.id)).toEqual(["replica-a", "replica-b", "replica-c"])
    })

    it("does not mutate input array", () => {
      const replicas = [
        createReplica({ id: "2", replica_state: "error" }),
        createReplica({ id: "1", replica_state: "active" }),
      ]
      const original = [...replicas]

      sortShareReplicas(replicas)
      expect(replicas).toEqual(original)
    })
  })

  describe("sortExportLocations", () => {
    const createLocation = (overrides: Partial<ShareExportLocation>): ShareExportLocation => ({
      id: "location-id",
      path: null,
      preferred: null,
      ...overrides,
    })

    it("sorts preferred locations first", () => {
      const locations = [
        createLocation({ id: "1", preferred: false }),
        createLocation({ id: "2", preferred: true }),
        createLocation({ id: "3", preferred: false }),
      ]

      const sorted = sortExportLocations(locations)
      expect(sorted.map((l) => l.id)).toEqual(["2", "1", "3"])
    })

    it("maintains stable order within preferred group", () => {
      const locations = [
        createLocation({ id: "1", preferred: true }),
        createLocation({ id: "2", preferred: true }),
        createLocation({ id: "3", preferred: true }),
      ]

      const sorted = sortExportLocations(locations)
      expect(sorted.map((l) => l.id)).toEqual(["1", "2", "3"])
    })

    it("maintains stable order within non-preferred group", () => {
      const locations = [
        createLocation({ id: "1", preferred: false }),
        createLocation({ id: "2", preferred: false }),
        createLocation({ id: "3", preferred: false }),
      ]

      const sorted = sortExportLocations(locations)
      expect(sorted.map((l) => l.id)).toEqual(["1", "2", "3"])
    })

    it("treats null/undefined preferred as non-preferred", () => {
      const locations = [
        createLocation({ id: "1", preferred: null }),
        createLocation({ id: "2", preferred: true }),
        createLocation({ id: "3", preferred: undefined }),
      ]

      const sorted = sortExportLocations(locations)
      expect(sorted[0].id).toBe("2") // preferred first
      // 1 and 3 maintain their original order
      expect(sorted.slice(1).map((l) => l.id)).toEqual(["1", "3"])
    })

    it("does not mutate input array", () => {
      const locations = [createLocation({ id: "2", preferred: true }), createLocation({ id: "1", preferred: false })]
      const original = [...locations]

      sortExportLocations(locations)
      expect(locations).toEqual(original)
    })
  })

  describe("getReplicaStateLabel", () => {
    it("returns descriptor for active", () => {
      const descriptor = getReplicaStateLabel("active")
      expect(descriptor).toBeDefined()
      expect(descriptor).toHaveProperty("id")
    })

    it("returns descriptor for in_sync", () => {
      const descriptor = getReplicaStateLabel("in_sync")
      expect(descriptor).toBeDefined()
      expect(descriptor).toHaveProperty("id")
    })

    it("returns descriptor for out_of_sync", () => {
      const descriptor = getReplicaStateLabel("out_of_sync")
      expect(descriptor).toBeDefined()
      expect(descriptor).toHaveProperty("id")
    })

    it("returns descriptor for error", () => {
      const descriptor = getReplicaStateLabel("error")
      expect(descriptor).toBeDefined()
      expect(descriptor).toHaveProperty("id")
    })

    it("is case-insensitive", () => {
      expect(getReplicaStateLabel("ACTIVE")).toBeDefined()
      expect(getReplicaStateLabel("IN_SYNC")).toBeDefined()
      expect(getReplicaStateLabel("OUT_OF_SYNC")).toBeDefined()
      expect(getReplicaStateLabel("ERROR")).toBeDefined()
    })

    it("returns undefined for unknown states", () => {
      expect(getReplicaStateLabel("unknown")).toBeUndefined()
      expect(getReplicaStateLabel("random")).toBeUndefined()
    })

    it("returns undefined for missing states", () => {
      expect(getReplicaStateLabel(null)).toBeUndefined()
      expect(getReplicaStateLabel(undefined)).toBeUndefined()
      expect(getReplicaStateLabel("")).toBeUndefined()
    })
  })

  describe("DEFAULT_SHARE_DETAILS_TAB", () => {
    it("is export-locations", () => {
      expect(DEFAULT_SHARE_DETAILS_TAB).toBe("export-locations")
    })
  })
})

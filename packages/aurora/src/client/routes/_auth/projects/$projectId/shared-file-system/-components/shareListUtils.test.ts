import { describe, it, expect } from "vitest"
import type { Share } from "@/server/SharedFileSystem/types/share"
import {
  getShareStatusRank,
  getShareTypeLabel,
  getShareDisplayName,
  parseManilaTimestamp,
  matchesShareSearch,
  filterShares,
  sortShares,
  getDistinctValues,
} from "./shareListUtils"

describe("getShareStatusRank", () => {
  it("returns 0 for error statuses", () => {
    expect(getShareStatusRank("error")).toBe(0)
    expect(getShareStatusRank("error_deleting")).toBe(0)
    expect(getShareStatusRank("extending_error")).toBe(0)
    expect(getShareStatusRank("shrinking_possible_data_loss_error")).toBe(0)
    expect(getShareStatusRank("backup_restoring_error")).toBe(0)
  })

  it("returns 1 for transitional statuses", () => {
    expect(getShareStatusRank("creating")).toBe(1)
    expect(getShareStatusRank("deleting")).toBe(1)
    expect(getShareStatusRank("extending")).toBe(1)
    expect(getShareStatusRank("shrinking")).toBe(1)
    expect(getShareStatusRank("migrating")).toBe(1)
    expect(getShareStatusRank("backup_creating")).toBe(1)
    expect(getShareStatusRank("backup_restoring")).toBe(1)
  })

  it("returns 2 for inactive/awaiting statuses", () => {
    expect(getShareStatusRank("inactive")).toBe(2)
    expect(getShareStatusRank("awaiting_transfer")).toBe(2)
  })

  it("returns 3 for available", () => {
    expect(getShareStatusRank("available")).toBe(3)
  })

  it("returns 4 for unknown/missing statuses", () => {
    expect(getShareStatusRank("deleted")).toBe(4)
    expect(getShareStatusRank("unmanaged")).toBe(4)
    expect(getShareStatusRank("weird_state")).toBe(4)
    expect(getShareStatusRank(null)).toBe(4)
    expect(getShareStatusRank(undefined)).toBe(4)
    expect(getShareStatusRank("")).toBe(4)
  })

  it("handles upper-case input", () => {
    expect(getShareStatusRank("ERROR")).toBe(0)
    expect(getShareStatusRank("CREATING")).toBe(1)
    expect(getShareStatusRank("AVAILABLE")).toBe(3)
  })
})

describe("getShareTypeLabel", () => {
  it("returns share_type_name when present", () => {
    const share = { id: "1", share_type_name: "default" } as Share
    expect(getShareTypeLabel(share)).toBe("default")
  })

  it("falls back to share_type UUID when name is missing", () => {
    const share = { id: "1", share_type: "abc-123" } as Share
    expect(getShareTypeLabel(share)).toBe("abc-123")
  })

  it("returns undefined when both are missing", () => {
    const share = { id: "1" } as Share
    expect(getShareTypeLabel(share)).toBeUndefined()
  })

  it("trims whitespace", () => {
    const share = { id: "1", share_type_name: "  default  " } as Share
    expect(getShareTypeLabel(share)).toBe("default")
  })
})

describe("getShareDisplayName", () => {
  it("returns name when present", () => {
    const share = { id: "123", name: "my-share" } as Share
    expect(getShareDisplayName(share)).toBe("my-share")
  })

  it("falls back to ID when name is missing", () => {
    const share = { id: "123" } as Share
    expect(getShareDisplayName(share)).toBe("123")
  })

  it("trims whitespace from name", () => {
    const share = { id: "123", name: "  my-share  " } as Share
    expect(getShareDisplayName(share)).toBe("my-share")
  })
})

describe("parseManilaTimestamp", () => {
  it("parses offset-less timestamps as UTC", () => {
    const result = parseManilaTimestamp("2015-09-16T18:19:50.000000")
    expect(result).toBeInstanceOf(Date)
    expect(result?.toISOString()).toBe("2015-09-16T18:19:50.000Z")
  })

  it("parses timestamps with Z", () => {
    const result = parseManilaTimestamp("2015-09-16T18:19:50.000Z")
    expect(result).toBeInstanceOf(Date)
    expect(result?.toISOString()).toBe("2015-09-16T18:19:50.000Z")
  })

  it("parses timestamps with offset", () => {
    const result = parseManilaTimestamp("2015-09-16T18:19:50.000+02:00")
    expect(result).toBeInstanceOf(Date)
    expect(result?.toISOString()).toBe("2015-09-16T16:19:50.000Z")
  })

  it("returns undefined for invalid values", () => {
    expect(parseManilaTimestamp("not-a-date")).toBeUndefined()
    expect(parseManilaTimestamp(null)).toBeUndefined()
    expect(parseManilaTimestamp(undefined)).toBeUndefined()
    expect(parseManilaTimestamp("")).toBeUndefined()
  })
})

describe("matchesShareSearch", () => {
  const share = { id: "abc-123", name: "My Share" } as Share

  it("matches by name substring (case-insensitive)", () => {
    expect(matchesShareSearch(share, "my")).toBe(true)
    expect(matchesShareSearch(share, "SHARE")).toBe(true)
  })

  it("matches by ID substring", () => {
    expect(matchesShareSearch(share, "abc")).toBe(true)
    expect(matchesShareSearch(share, "123")).toBe(true)
  })

  it("trims the search term", () => {
    expect(matchesShareSearch(share, "  my  ")).toBe(true)
  })

  it("returns true for empty term", () => {
    expect(matchesShareSearch(share, "")).toBe(true)
    expect(matchesShareSearch(share, "   ")).toBe(true)
  })

  it("returns false for non-matching term", () => {
    expect(matchesShareSearch(share, "xyz")).toBe(false)
  })

  it("matches ID when name is missing", () => {
    const shareWithoutName = { id: "abc-123" } as Share
    expect(matchesShareSearch(shareWithoutName, "abc")).toBe(true)
  })
})

describe("filterShares", () => {
  const shares: Share[] = [
    { id: "1", status: "available", share_proto: "NFS", is_public: true } as Share,
    { id: "2", status: "error", share_proto: "CIFS", is_public: false } as Share,
    { id: "3", status: "creating", share_proto: "NFS", share_type_name: "default" } as Share,
    { id: "4", status: "weird_state", share_proto: "NVMe", availability_zone: "az1" } as Share,
    { id: "5" } as Share, // All fields missing
  ]

  it("filters by search term", () => {
    const result = filterShares(shares, "1", {})
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters by status", () => {
    const result = filterShares(shares, "", { status: "available" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters by status=other (matches unknown and missing)", () => {
    const result = filterShares(shares, "", { status: "other" })
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id).sort()).toEqual(["4", "5"])
  })

  it("filters by protocol (case-insensitive)", () => {
    const result = filterShares(shares, "", { protocol: "nfs" })
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id).sort()).toEqual(["1", "3"])
  })

  it("filters by protocol=other (matches unknown and missing)", () => {
    const result = filterShares(shares, "", { protocol: "other" })
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id).sort()).toEqual(["4", "5"])
  })

  it("filters by shareType", () => {
    const result = filterShares(shares, "", { shareType: "default" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("3")
  })

  it("filters by availabilityZone", () => {
    const result = filterShares(shares, "", { availabilityZone: "az1" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("4")
  })

  it("filters by visibility=public", () => {
    const result = filterShares(shares, "", { visibility: "public" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters by visibility=private", () => {
    const result = filterShares(shares, "", { visibility: "private" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("applies combined filters", () => {
    const result = filterShares(shares, "", { status: "available", protocol: "nfs" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })
})

describe("sortShares", () => {
  const shares: Share[] = [
    { id: "1", name: "Share A", status: "available", size: 10, created_at: "2015-09-16T10:00:00Z" } as Share,
    { id: "2", name: "Share B", status: "error", size: 5, created_at: "2015-09-16T12:00:00Z" } as Share,
    { id: "3", name: "Share C", status: "creating", created_at: "2015-09-16T08:00:00Z" } as Share,
    { id: "4", status: "inactive", size: 20 } as Share, // No name, no created_at
  ]

  it("sorts by name ascending", () => {
    const result = sortShares(shares, "name", "asc")
    // "4" (ID as displayName) sorts before "Share A" alphabetically
    expect(result.map((s) => s.id)).toEqual(["4", "1", "2", "3"])
  })

  it("sorts by name descending", () => {
    const result = sortShares(shares, "name", "desc")
    // Reverse: "Share C" > "Share B" > "Share A" > "4"
    expect(result.map((s) => s.id)).toEqual(["3", "2", "1", "4"])
  })

  it("sorts by status ascending (attention-first: error → transitional → inactive → available)", () => {
    const result = sortShares(shares, "status", "asc")
    expect(result.map((s) => s.id)).toEqual(["2", "3", "4", "1"])
  })

  it("sorts by status descending (reverses the entire E3 order)", () => {
    const result = sortShares(shares, "status", "desc")
    expect(result.map((s) => s.id)).toEqual(["1", "4", "3", "2"])
  })

  it("sorts by size ascending, with missing values last", () => {
    const result = sortShares(shares, "size", "asc")
    expect(result.map((s) => s.id)).toEqual(["2", "1", "4", "3"])
  })

  it("sorts by size descending, with missing values last", () => {
    const result = sortShares(shares, "size", "desc")
    expect(result.map((s) => s.id)).toEqual(["4", "1", "2", "3"])
  })

  it("sorts by created_at ascending, with missing values last", () => {
    const result = sortShares(shares, "created_at", "asc")
    expect(result.map((s) => s.id)).toEqual(["3", "1", "2", "4"])
  })

  it("sorts by created_at descending, with missing values last", () => {
    const result = sortShares(shares, "created_at", "desc")
    expect(result.map((s) => s.id)).toEqual(["2", "1", "3", "4"])
  })

  it("tie-breaks by name then ID", () => {
    const duplicates: Share[] = [
      { id: "b", name: "Same", status: "available" } as Share,
      { id: "a", name: "Same", status: "available" } as Share,
    ]
    const result = sortShares(duplicates, "status", "asc")
    expect(result.map((s) => s.id)).toEqual(["a", "b"])
  })
})

describe("getDistinctValues", () => {
  it("returns distinct, sorted values", () => {
    const result = getDistinctValues(["b", "a", "c", "a"])
    expect(result).toEqual(["a", "b", "c"])
  })

  it("drops null, undefined, and empty strings", () => {
    const result = getDistinctValues(["a", null, "", undefined, "b", "  "])
    expect(result).toEqual(["a", "b"])
  })

  it("trims whitespace", () => {
    const result = getDistinctValues(["  a  ", "b", " a"])
    expect(result).toEqual(["a", "b"])
  })
})

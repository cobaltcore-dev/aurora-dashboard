import { describe, it, expect } from "vitest"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import {
  getShareNetworkDisplayName,
  getSubnetCount,
  matchesShareNetworkSearch,
  filterShareNetworks,
  sortShareNetworks,
} from "./shareNetworkListUtils"

describe("shareNetworkListUtils", () => {
  describe("getShareNetworkDisplayName", () => {
    it("returns the name when present", () => {
      const network: ShareNetwork = { id: "net-1", name: "My Network" }
      expect(getShareNetworkDisplayName(network)).toBe("My Network")
    })

    it("trims the name", () => {
      const network: ShareNetwork = { id: "net-1", name: "  Spaced  " }
      expect(getShareNetworkDisplayName(network)).toBe("Spaced")
    })

    it("falls back to ID when name is missing", () => {
      const network: ShareNetwork = { id: "net-1" }
      expect(getShareNetworkDisplayName(network)).toBe("net-1")
    })

    it("falls back to ID when name is empty", () => {
      const network: ShareNetwork = { id: "net-1", name: "" }
      expect(getShareNetworkDisplayName(network)).toBe("net-1")
    })

    it("falls back to ID when name is whitespace", () => {
      const network: ShareNetwork = { id: "net-1", name: "   " }
      expect(getShareNetworkDisplayName(network)).toBe("net-1")
    })
  })

  describe("getSubnetCount", () => {
    it("returns the length of the subnets array", () => {
      const network: ShareNetwork = {
        id: "net-1",
        share_network_subnets: [{ id: "sub-1" }, { id: "sub-2" }],
      }
      expect(getSubnetCount(network)).toBe(2)
    })

    it("returns 0 for an empty array", () => {
      const network: ShareNetwork = {
        id: "net-1",
        share_network_subnets: [],
      }
      expect(getSubnetCount(network)).toBe(0)
    })

    it("returns undefined when subnets is missing", () => {
      const network: ShareNetwork = { id: "net-1" }
      expect(getSubnetCount(network)).toBeUndefined()
    })

    it("returns undefined when subnets is null", () => {
      const network: ShareNetwork = { id: "net-1", share_network_subnets: null }
      expect(getSubnetCount(network)).toBeUndefined()
    })
  })

  describe("matchesShareNetworkSearch", () => {
    const network: ShareNetwork = { id: "abc-123", name: "Test Network" }

    it("matches by name (case-insensitive)", () => {
      expect(matchesShareNetworkSearch(network, "test")).toBe(true)
      expect(matchesShareNetworkSearch(network, "TEST")).toBe(true)
      expect(matchesShareNetworkSearch(network, "Network")).toBe(true)
    })

    it("matches by ID (case-insensitive)", () => {
      expect(matchesShareNetworkSearch(network, "abc")).toBe(true)
      expect(matchesShareNetworkSearch(network, "123")).toBe(true)
      expect(matchesShareNetworkSearch(network, "ABC-123")).toBe(true)
    })

    it("does not match when term is not present", () => {
      expect(matchesShareNetworkSearch(network, "xyz")).toBe(false)
    })

    it("matches when term is empty", () => {
      expect(matchesShareNetworkSearch(network, "")).toBe(true)
    })

    it("matches when term is whitespace", () => {
      expect(matchesShareNetworkSearch(network, "   ")).toBe(true)
    })

    it("matches by ID when name is missing", () => {
      const noName: ShareNetwork = { id: "def-456" }
      expect(matchesShareNetworkSearch(noName, "def")).toBe(true)
    })
  })

  describe("filterShareNetworks", () => {
    const networks: ShareNetwork[] = [
      { id: "net-1", name: "Alpha" },
      { id: "net-2", name: "Beta" },
      { id: "net-3" }, // no name
    ]

    it("filters by name", () => {
      const result = filterShareNetworks(networks, "alpha")
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("net-1")
    })

    it("filters by ID", () => {
      const result = filterShareNetworks(networks, "net-3")
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("net-3")
    })

    it("returns all networks when term is empty", () => {
      const result = filterShareNetworks(networks, "")
      expect(result).toHaveLength(3)
    })

    it("returns no networks when no match", () => {
      const result = filterShareNetworks(networks, "zzz")
      expect(result).toHaveLength(0)
    })
  })

  describe("sortShareNetworks", () => {
    const networkA: ShareNetwork = { id: "net-1", name: "Alpha", created_at: "2023-01-01T00:00:00" }
    const networkB: ShareNetwork = { id: "net-2", name: "Beta", created_at: "2023-01-02T00:00:00" }
    const networkC: ShareNetwork = {
      id: "net-3",
      created_at: "2023-01-03T00:00:00",
      share_network_subnets: [{ id: "sub-1" }],
    }
    const networkD: ShareNetwork = {
      id: "net-4",
      name: "Delta",
      share_network_subnets: [{ id: "sub-1" }, { id: "sub-2" }],
    }

    it("does not mutate the input array", () => {
      const input = [networkB, networkA]
      const result = sortShareNetworks(input, "name", "asc")
      expect(result).not.toBe(input)
      expect(input[0]).toBe(networkB)
    })

    describe("name sort", () => {
      it("sorts by display name ascending", () => {
        const result = sortShareNetworks([networkB, networkA], "name", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-2"])
      })

      it("sorts by display name descending", () => {
        const result = sortShareNetworks([networkA, networkB], "name", "desc")
        expect(result.map((n) => n.id)).toEqual(["net-2", "net-1"])
      })

      it("sorts unnamed network by ID", () => {
        const result = sortShareNetworks([networkC, networkA], "name", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-3"])
      })
    })

    describe("subnet_count sort", () => {
      it("sorts by subnet count ascending", () => {
        const result = sortShareNetworks([networkD, networkC], "subnet_count", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-3", "net-4"])
      })

      it("sorts by subnet count descending", () => {
        const result = sortShareNetworks([networkC, networkD], "subnet_count", "desc")
        expect(result.map((n) => n.id)).toEqual(["net-4", "net-3"])
      })

      it("treats empty array as 0", () => {
        const withEmpty: ShareNetwork = { id: "net-5", share_network_subnets: [] }
        const result = sortShareNetworks([networkC, withEmpty], "subnet_count", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-5", "net-3"])
      })

      it("places missing subnet count last in ascending order", () => {
        const result = sortShareNetworks([networkA, networkC], "subnet_count", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-3", "net-1"])
      })

      it("places missing subnet count last in descending order", () => {
        const result = sortShareNetworks([networkC, networkA], "subnet_count", "desc")
        expect(result.map((n) => n.id)).toEqual(["net-3", "net-1"])
      })

      it("tie-breaks by display name", () => {
        const net5: ShareNetwork = { id: "net-5", name: "Alpha2", share_network_subnets: [{ id: "s1" }] }
        const result = sortShareNetworks([net5, networkC], "subnet_count", "asc")
        // Both have 1 subnet; net-3 has no name so sorts by ID; net-5 has name "Alpha2"
        expect(result.map((n) => n.id)).toEqual(["net-5", "net-3"])
      })
    })

    describe("created_at sort", () => {
      it("sorts by created date ascending", () => {
        const result = sortShareNetworks([networkB, networkA], "created_at", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-2"])
      })

      it("sorts by created date descending", () => {
        const result = sortShareNetworks([networkA, networkB], "created_at", "desc")
        expect(result.map((n) => n.id)).toEqual(["net-2", "net-1"])
      })

      it("places missing created_at last in ascending order", () => {
        const noDate: ShareNetwork = { id: "net-6", name: "No Date" }
        const result = sortShareNetworks([noDate, networkA], "created_at", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-6"])
      })

      it("places missing created_at last in descending order", () => {
        const noDate: ShareNetwork = { id: "net-6", name: "No Date" }
        const result = sortShareNetworks([networkA, noDate], "created_at", "desc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-6"])
      })

      it("places unparsable created_at last", () => {
        const badDate: ShareNetwork = { id: "net-7", created_at: "not-a-date" }
        const result = sortShareNetworks([badDate, networkA], "created_at", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-1", "net-7"])
      })

      it("tie-breaks by display name then ID", () => {
        const sameDate1: ShareNetwork = { id: "net-8", name: "Beta", created_at: "2023-01-01T00:00:00" }
        const sameDate2: ShareNetwork = { id: "net-9", name: "Alpha", created_at: "2023-01-01T00:00:00" }
        const result = sortShareNetworks([sameDate1, sameDate2], "created_at", "asc")
        expect(result.map((n) => n.id)).toEqual(["net-9", "net-8"])
      })
    })
  })
})

import { describe, it, expect, vi } from "vitest"
import { Flavor } from "../types/flavor"
import { includesSearchTerm, fetchFlavors, filterAndSortFlavors } from "./flavorHelpers"

const mockFlavors: Flavor[] = [
  {
    id: "1",
    name: "flavor1",
    description: "first flavor",
  },
  {
    id: "2",
    name: "flavor2",
    description: "second flavor",
  },
  {
    id: "3",
    name: "flavor3",
    description: "third flavor",
  },
]

describe("includesSearchTerm", () => {
  it("should return true if search term is in any field", () => {
    const flavor: Flavor = {
      id: "1",
      name: "test flavor",
      description: "a test description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should return false if search term is not in any field", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: "description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(false)
  })
})

describe("fetchFlavors", () => {
  it("should return flavors if response is valid", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify({ flavors: mockFlavors })),
      }),
    }

    const flavors = await fetchFlavors(mockCompute)
    expect(flavors).toEqual(mockFlavors)
  })

  it("should throw an error if Zod parsing fails", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify({ invalid: "data" })),
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow("Zod Parsing Error")
  })
})

describe("filterAndSortFlavors", () => {
  it("should filter and sort flavors correctly", () => {
    const sortedFlavors = filterAndSortFlavors([...mockFlavors], "flavor", "name", "asc")
    expect(sortedFlavors).toEqual([
      {
        id: "1",
        name: "flavor1",
        description: "first flavor",
      },
      {
        id: "2",
        name: "flavor2",
        description: "second flavor",
      },
      {
        id: "3",
        name: "flavor3",
        description: "third flavor",
      },
    ])
  })

  it("should return empty array if no flavors match the search term", () => {
    const filteredFlavors = filterAndSortFlavors([...mockFlavors], "nonexistentTerm", "name", "asc")
    expect(filteredFlavors).toEqual([])
  })
})

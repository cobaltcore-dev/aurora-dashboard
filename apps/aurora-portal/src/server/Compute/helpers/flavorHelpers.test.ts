import { describe, it, expect, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { Flavor } from "../types/flavor"
import { includesSearchTerm, fetchFlavors, filterAndSortFlavors } from "./flavorHelpers"
import { ERROR_CODES } from "../../errorCodes"

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
  it("should return true if search term is in id", () => {
    const flavor: Flavor = {
      id: "test-123",
      name: "flavor",
      description: "description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should return true if search term is in name", () => {
    const flavor: Flavor = {
      id: "1",
      name: "test flavor",
      description: "description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should return true if search term is in description", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: "a test description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should be case insensitive", () => {
    const flavor: Flavor = {
      id: "1",
      name: "TEST FLAVOR",
      description: "description",
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
    expect(includesSearchTerm(flavor, "TEST")).toBe(true)
    expect(includesSearchTerm(flavor, "TeSt")).toBe(true)
  })

  it("should return false if search term is not in any field", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: "description",
    }

    expect(includesSearchTerm(flavor, "notfound")).toBe(false)
  })

  it("should handle null and undefined values gracefully", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: null,
    }

    expect(includesSearchTerm(flavor, "test")).toBe(false)
  })
})

describe("fetchFlavors", () => {
  it("should return flavors if response is valid", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ flavors: mockFlavors })),
      }),
    }

    const flavors = await fetchFlavors(mockCompute)
    expect(flavors).toEqual(mockFlavors)
    expect(mockCompute.get).toHaveBeenCalledWith("flavors/detail")
  })

  it("should throw PARSE_ERROR if Zod parsing fails", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ invalid: "data" })),
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: ERROR_CODES.FLAVORS_PARSE_ERROR,
      })
    )
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.FLAVORS_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.FLAVORS_FORBIDDEN,
      })
    )
  })

  it("should throw NOT_FOUND for 404 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.FLAVORS_NOT_FOUND,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.FLAVORS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 502 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.FLAVORS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 503 status", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.FLAVORS_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: false,
        status: 418,
      }),
    }

    await expect(fetchFlavors(mockCompute)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.FLAVORS_FETCH_FAILED,
      })
    )
  })
})

describe("filterAndSortFlavors", () => {
  it("should return all flavors when no search term is provided", () => {
    const result = filterAndSortFlavors([...mockFlavors], "", "name", "asc")
    expect(result).toHaveLength(3)
    expect(result).toEqual(mockFlavors)
  })

  it("should filter flavors by search term", () => {
    const result = filterAndSortFlavors([...mockFlavors], "first", "name", "asc")
    expect(result).toEqual([
      {
        id: "1",
        name: "flavor1",
        description: "first flavor",
      },
    ])
  })

  it("should sort by name ascending", () => {
    const unsortedFlavors = [mockFlavors[2], mockFlavors[0], mockFlavors[1]] // 3, 1, 2
    const result = filterAndSortFlavors(unsortedFlavors, "", "name", "asc")

    expect(result.map((f) => f.name)).toEqual(["flavor1", "flavor2", "flavor3"])
  })

  it("should sort by name descending", () => {
    const result = filterAndSortFlavors([...mockFlavors], "", "name", "desc")

    expect(result.map((f) => f.name)).toEqual(["flavor3", "flavor2", "flavor1"])
  })

  it("should sort by id", () => {
    const result = filterAndSortFlavors([...mockFlavors], "", "id", "desc")

    expect(result.map((f) => f.id)).toEqual(["3", "2", "1"])
  })

  it("should return empty array if no flavors match the search term", () => {
    const result = filterAndSortFlavors([...mockFlavors], "nonexistentTerm", "name", "asc")
    expect(result).toEqual([])
  })

  it("should combine filtering and sorting", () => {
    const extraFlavors: Flavor[] = [
      ...mockFlavors,
      { id: "4", name: "special-flavor", description: "special one" },
      { id: "5", name: "another-flavor", description: "another special" },
    ]

    const result = filterAndSortFlavors(extraFlavors, "special", "name", "desc")
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("special-flavor")
    expect(result[1].name).toBe("another-flavor")
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { CreateFlavorInput, Flavor } from "../types/flavor"
import {
  includesSearchTerm,
  fetchFlavors,
  filterAndSortFlavors,
  createFlavor,
  deleteFlavor,
  createExtraSpecs,
  getExtraSpecs,
  deleteExtraSpec,
} from "./flavorHelpers"
import { ERROR_CODES } from "../../errorCodes"

const mockFlavors: Flavor[] = [
  {
    id: "1",
    name: "flavor1",
    description: "first flavor",
    vcpus: 1,
    ram: 128,
    disk: 0,
    swap: "0",
    rxtx_factor: 1,
    "OS-FLV-EXT-DATA:ephemeral": 0,
  },
  {
    id: "2",
    name: "flavor2",
    description: "second flavor",
    vcpus: 1,
    ram: 128,
    disk: 0,
    swap: "0",
    rxtx_factor: 1,
    "OS-FLV-EXT-DATA:ephemeral": 0,
  },
  {
    id: "3",
    name: "flavor3",
    description: "third flavor",
    vcpus: 1,
    ram: 128,
    disk: 0,
    swap: "0",
    rxtx_factor: 1,
    "OS-FLV-EXT-DATA:ephemeral": 0,
  },
]

describe("includesSearchTerm", () => {
  it("should return true if search term is in id", () => {
    const flavor: Flavor = {
      id: "test-123",
      name: "flavor",
      description: "description",
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should return true if search term is in name", () => {
    const flavor: Flavor = {
      id: "1",
      name: "test flavor",
      description: "description",
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should return true if search term is in description", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: "a test description",
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    expect(includesSearchTerm(flavor, "test")).toBe(true)
  })

  it("should be case insensitive", () => {
    const flavor: Flavor = {
      id: "1",
      name: "TEST FLAVOR",
      description: "description",
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
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
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    expect(includesSearchTerm(flavor, "notfound")).toBe(false)
  })

  it("should handle null and undefined values gracefully", () => {
    const flavor: Flavor = {
      id: "1",
      name: "flavor",
      description: null,
      vcpus: 1,
      ram: 128,
      disk: 0,
      swap: "0",
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 0,
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
      post: vi.fn(),
      del: vi.fn(),
    }

    const flavors = await fetchFlavors(mockCompute, "true")
    expect(flavors).toEqual(mockFlavors)
    expect(mockCompute.get).toHaveBeenCalledWith("flavors/detail", {
      queryParams: {
        is_public: "true",
      },
    })
  })

  it("should throw PARSE_ERROR if Zod parsing fails", async () => {
    const mockCompute = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ invalid: "data" })),
      }),
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
      post: vi.fn(),
      del: vi.fn(),
    }

    await expect(fetchFlavors(mockCompute, "true")).rejects.toThrow(
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
        vcpus: 1,
        ram: 128,
        disk: 0,
        swap: "0",
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
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
      {
        id: "4",
        name: "special-flavor",
        description: "special one",
        vcpus: 1,
        ram: 128,
        disk: 0,
        swap: "0",
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      },
      {
        id: "5",
        name: "another-flavor",
        description: "another special",
        vcpus: 1,
        ram: 128,
        disk: 0,
        swap: "0",
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      },
    ]

    const result = filterAndSortFlavors(extraFlavors, "special", "name", "desc")
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("special-flavor")
    expect(result[1].name).toBe("another-flavor")
  })
})
describe("createFlavor", () => {
  const compute = {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }

  const flavorData: CreateFlavorInput = {
    name: "test-flavor2",
    vcpus: 1,
    ram: 128,
    disk: 0,
    swap: 128,
  }

  const mockFlavor: Flavor = {
    id: "1",
    name: "test-flavor",
    description: "Test flavor description",
    vcpus: 1,
    ram: 128,
    disk: 0,
    swap: "0",
    rxtx_factor: 1,
    "OS-FLV-EXT-DATA:ephemeral": 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return the created flavor if response is valid", async () => {
    compute.post.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ flavor: mockFlavor })),
    })

    const result = await createFlavor(compute, flavorData)
    expect(result).toEqual(mockFlavor)
    expect(compute.post).toHaveBeenCalledWith("flavors", { flavor: flavorData })
  })

  it("should throw BAD_REQUEST for 400 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 400,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_FLAVOR_INVALID_DATA,
      })
    )
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.CREATE_FLAVOR_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.CREATE_FLAVOR_FORBIDDEN,
      })
    )
  })

  it("should throw CONFLICT for 409 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 409,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: ERROR_CODES.CREATE_FLAVOR_CONFLICT,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 502 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 502,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 503 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 503,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_FLAVOR_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 418,
    })

    await expect(createFlavor(compute, flavorData)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_FLAVOR_FAILED,
      })
    )
  })
})

describe("deleteFlavor", () => {
  const compute = {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }

  const flavorId = "test-flavor-id"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should successfully delete a flavor", async () => {
    compute.del.mockResolvedValue({
      ok: true,
      status: 204,
    })

    await expect(deleteFlavor(compute, flavorId)).resolves.toBeUndefined()
    expect(compute.del).toHaveBeenCalledWith(`flavors/${flavorId}`)
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.DELETE_FLAVOR_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.DELETE_FLAVOR_FORBIDDEN,
      })
    )
  })

  it("should throw NOT_FOUND for 404 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.DELETE_FLAVOR_NOT_FOUND,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_FLAVOR_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 418,
    })

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_FLAVOR_FAILED,
      })
    )
  })

  it("should re-throw TRPCError from network request", async () => {
    const originalError = new TRPCError({
      code: "TIMEOUT",
      message: "Request timeout",
    })

    compute.del.mockRejectedValue(originalError)

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(originalError)
  })

  it("should wrap non-TRPC errors in INTERNAL_SERVER_ERROR", async () => {
    const networkError = new Error("Network connection failed")
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    compute.del.mockRejectedValue(networkError)

    await expect(deleteFlavor(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_FLAVOR_FAILED,
        cause: networkError,
      })
    )

    expect(consoleSpy).toHaveBeenCalledWith(`Failed to delete flavor ${flavorId}:`, networkError)

    consoleSpy.mockRestore()
  })
  it("should throw error on empty string flavorId", async () => {
    const originalError = new TRPCError({
      code: "BAD_REQUEST",
      message: ERROR_CODES.DELETE_FLAVOR_INVALID_ID,
    })

    await expect(deleteFlavor(compute, "")).rejects.toThrow(originalError)
    expect(compute.del).not.toHaveBeenCalled()
  })
})
describe("createExtraSpecs", () => {
  const compute = {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }

  const flavorId = "test-flavor-id"
  const extraSpecs = { cpu: "dedicated", "hw:mem_page_size": "large" }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return created extra specs if response is valid", async () => {
    compute.post.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ extra_specs: extraSpecs })),
    })

    const result = await createExtraSpecs(compute, flavorId, extraSpecs)
    expect(result).toEqual(extraSpecs)
    expect(compute.post).toHaveBeenCalledWith(`flavors/${flavorId}/os-extra_specs`, {
      extra_specs: extraSpecs,
    })
  })

  it("should throw BAD_REQUEST for 400 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 400,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_INVALID_DATA,
      })
    )
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FORBIDDEN,
      })
    )
  })

  it("should throw NOT_FOUND for 404 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_NOT_FOUND,
      })
    )
  })

  it("should throw CONFLICT for 409 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 409,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_CONFLICT,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 502 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 502,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 503 status", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 503,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    compute.post.mockResolvedValue({
      ok: false,
      status: 418,
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
      })
    )
  })

  it("should re-throw TRPCError from network request", async () => {
    const originalError = new TRPCError({
      code: "TIMEOUT",
      message: "Request timeout",
    })

    compute.post.mockRejectedValue(originalError)

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(originalError)
  })

  it("should wrap non-TRPC errors in INTERNAL_SERVER_ERROR", async () => {
    const networkError = new Error("Network connection failed")

    compute.post.mockRejectedValue(networkError)

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
        cause: networkError,
      })
    )
  })

  it("should handle JSON parsing errors", async () => {
    compute.post.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("invalid json"),
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
      })
    )
  })
})

describe("getExtraSpecs", () => {
  const compute = {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }

  const flavorId = "test-flavor-id"
  const extraSpecs = { cpu: "dedicated", "hw:mem_page_size": "large" }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return extra specs if response is valid", async () => {
    compute.get.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ extra_specs: extraSpecs })),
    })

    const result = await getExtraSpecs(compute, flavorId)
    expect(result).toEqual(extraSpecs)
    expect(compute.get).toHaveBeenCalledWith(`flavors/${flavorId}/os-extra_specs`)
  })

  it("should return empty object if extra_specs is null or undefined", async () => {
    compute.get.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({})),
    })

    const result = await getExtraSpecs(compute, flavorId)
    expect(result).toEqual({})
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.GET_EXTRA_SPECS_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.GET_EXTRA_SPECS_FORBIDDEN,
      })
    )
  })

  it("should throw NOT_FOUND for 404 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.GET_EXTRA_SPECS_NOT_FOUND,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 502 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 502,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 503 status", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 503,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.GET_EXTRA_SPECS_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    compute.get.mockResolvedValue({
      ok: false,
      status: 418,
    })

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
      })
    )
  })

  it("should re-throw TRPCError from network request", async () => {
    const originalError = new TRPCError({
      code: "TIMEOUT",
      message: "Request timeout",
    })

    compute.get.mockRejectedValue(originalError)

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(originalError)
  })

  it("should wrap non-TRPC errors in INTERNAL_SERVER_ERROR", async () => {
    const networkError = new Error("Network connection failed")

    compute.get.mockRejectedValue(networkError)

    await expect(getExtraSpecs(compute, flavorId)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
        cause: networkError,
      })
    )
  })

  it("should handle JSON parsing errors", async () => {
    compute.get.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("invalid json"),
    })

    await expect(createExtraSpecs(compute, flavorId, extraSpecs)).rejects.toThrow(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
      })
    )
  })
})

describe("deleteExtraSpec", () => {
  const compute = {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }

  const flavorId = "test-flavor-id"
  const specKey = "cpu"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should successfully delete an extra spec", async () => {
    compute.del.mockResolvedValue({
      ok: true,
      status: 204,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).resolves.toBeUndefined()
    expect(compute.del).toHaveBeenCalledWith(`flavors/${flavorId}/os-extra_specs/${specKey}`)
  })

  it("should throw BAD_REQUEST for 400 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 400,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_INVALID_KEY,
      })
    )
  })

  it("should throw UNAUTHORIZED for 401 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_UNAUTHORIZED,
      })
    )
  })

  it("should throw FORBIDDEN for 403 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_FORBIDDEN,
      })
    )
  })

  it("should throw NOT_FOUND for 404 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_NOT_FOUND,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 500 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 502 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 502,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR,
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR for 503 status", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 503,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_SERVER_ERROR,
      })
    )
  })

  it("should throw BAD_REQUEST for unknown status codes", async () => {
    compute.del.mockResolvedValue({
      ok: false,
      status: 418,
    })

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
      })
    )
  })

  it("should re-throw TRPCError from network request", async () => {
    const originalError = new TRPCError({
      code: "TIMEOUT",
      message: "Request timeout",
    })

    compute.del.mockRejectedValue(originalError)

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(originalError)
  })

  it("should wrap non-TRPC errors in INTERNAL_SERVER_ERROR", async () => {
    const networkError = new Error("Network connection failed")

    compute.del.mockRejectedValue(networkError)

    await expect(deleteExtraSpec(compute, flavorId, specKey)).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
        cause: networkError,
      })
    )
  })
})

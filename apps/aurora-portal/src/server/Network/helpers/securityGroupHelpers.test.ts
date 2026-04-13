import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import {
  SecurityGroupErrorHandlers,
  deduplicateSecurityGroupsById,
  sortSecurityGroups,
  applyMarkerPagination,
} from "./securityGroupHelpers"
import type { SecurityGroup } from "../types/securityGroup"

describe("SecurityGroupErrorHandlers.create", () => {
  it("handles 401 Unauthorized", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 401 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 403 Forbidden", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 403, statusText: "Forbidden" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toContain("Access forbidden")
  })

  it("handles 409 Conflict", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 409, statusText: "Already exists" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("Conflict")
  })

  it("handles 413 Quota exceeded", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 413 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toContain("Quota exceeded")
    expect(error.message).toContain("contact your administrator")
  })

  it("handles 400 Bad Request", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 400, statusText: "Invalid input" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toContain("Invalid request")
  })

  it("handles unknown error codes", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 500, statusText: "Server error" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to create security group")
  })

  it("handles missing statusText", () => {
    const error = SecurityGroupErrorHandlers.create({ status: 500 })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.message).toContain("Unknown error")
  })
})

describe("SecurityGroupErrorHandlers.delete", () => {
  it("handles 401 Unauthorized", () => {
    const error = SecurityGroupErrorHandlers.delete({ status: 401 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 404 Not Found", () => {
    const error = SecurityGroupErrorHandlers.delete({ status: 404 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe("Security group not found: sg-123")
  })

  it("handles 409 Conflict (in use)", () => {
    const error = SecurityGroupErrorHandlers.delete({ status: 409 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("in use by one or more ports")
    expect(error.message).toContain("remove all associations")
  })

  it("handles unknown error codes", () => {
    const error = SecurityGroupErrorHandlers.delete({ status: 500, statusText: "Server error" }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to delete security group")
  })

  it("handles missing statusText", () => {
    const error = SecurityGroupErrorHandlers.delete({ status: 500 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.message).toContain("Unknown error")
  })
})

describe("SecurityGroupErrorHandlers.update", () => {
  it("handles 401 Unauthorized", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 401 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("handles 403 Forbidden", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 403, statusText: "Forbidden" }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toContain("Access forbidden")
  })

  it("handles 404 Not Found", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 404 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe("Security group not found: sg-123")
  })

  it("handles 409 Conflict", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 409, statusText: "Conflict error" }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("Conflict")
  })

  it("handles 400 Bad Request", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 400, statusText: "Invalid input" }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toContain("Invalid request")
  })

  it("handles stateful update on in-use security group", () => {
    const error = SecurityGroupErrorHandlers.update(
      { status: 409, statusText: "Cannot update stateful attribute while in use" },
      "sg-123"
    )

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("Cannot update the 'stateful' attribute")
    expect(error.message).toContain("in use by one or more ports")
  })

  it("handles unknown error codes", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 500, statusText: "Server error" }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toContain("Failed to update security group")
  })

  it("handles missing statusText", () => {
    const error = SecurityGroupErrorHandlers.update({ status: 500 }, "sg-123")

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.message).toContain("Unknown error")
  })
})

describe("deduplicateSecurityGroupsById", () => {
  it("removes duplicate items by id", () => {
    const items = [
      { id: "sg-1", name: "first" },
      { id: "sg-2", name: "second" },
      { id: "sg-1", name: "duplicate" },
      { id: "sg-3", name: "third" },
    ]

    const result = deduplicateSecurityGroupsById(items)

    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual(["sg-1", "sg-2", "sg-3"])
    // First occurrence should be kept
    expect(result[0].name).toBe("first")
  })

  it("returns empty array when input is empty", () => {
    const result = deduplicateSecurityGroupsById([])
    expect(result).toEqual([])
  })

  it("handles array with all unique items", () => {
    const items = [
      { id: "sg-1", name: "first" },
      { id: "sg-2", name: "second" },
      { id: "sg-3", name: "third" },
    ]

    const result = deduplicateSecurityGroupsById(items)
    expect(result).toHaveLength(3)
    expect(result).toEqual(items)
  })

  it("handles array with all duplicate items", () => {
    const items = [
      { id: "sg-1", name: "first" },
      { id: "sg-1", name: "duplicate1" },
      { id: "sg-1", name: "duplicate2" },
    ]

    const result = deduplicateSecurityGroupsById(items)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("first")
  })
})

describe("sortSecurityGroups", () => {
  const mockSecurityGroups: SecurityGroup[] = [
    {
      id: "sg-3",
      name: "zebra",
      description: "Last alphabetically",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
    {
      id: "sg-1",
      name: "alpha",
      description: "First alphabetically",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
    {
      id: "sg-2",
      name: "beta",
      description: "Second alphabetically",
      project_id: "proj-1",
      shared: true,
      stateful: false,
      security_group_rules: [],
    },
  ]

  it("returns items unchanged when sortKey is undefined", () => {
    const result = sortSecurityGroups(mockSecurityGroups)
    expect(result).toEqual(mockSecurityGroups)
  })

  it("sorts by string field in ascending order", () => {
    const result = sortSecurityGroups(mockSecurityGroups, "name", "asc")
    expect(result.map((sg) => sg.name)).toEqual(["alpha", "beta", "zebra"])
  })

  it("sorts by string field in descending order", () => {
    const result = sortSecurityGroups(mockSecurityGroups, "name", "desc")
    expect(result.map((sg) => sg.name)).toEqual(["zebra", "beta", "alpha"])
  })

  it("sorts by boolean field in ascending order", () => {
    const result = sortSecurityGroups(mockSecurityGroups, "stateful", "asc")
    expect(result.map((sg) => sg.stateful)).toEqual([false, true, true])
  })

  it("sorts by boolean field in descending order", () => {
    const result = sortSecurityGroups(mockSecurityGroups, "stateful", "desc")
    expect(result.map((sg) => sg.stateful)).toEqual([true, true, false])
  })

  it("handles null values by placing them last in ascending order", () => {
    const itemsWithNull = [
      { id: "1", name: "alpha", value: null },
      { id: "2", name: "beta", value: 100 },
      { id: "3", name: "gamma", value: 50 },
    ]

    const result = sortSecurityGroups(itemsWithNull, "value", "asc")
    expect(result.map((item) => item.id)).toEqual(["3", "2", "1"])
  })

  it("handles null values by placing them last in descending order", () => {
    const itemsWithNull = [
      { id: "1", name: "alpha", value: null },
      { id: "2", name: "beta", value: 100 },
      { id: "3", name: "gamma", value: 50 },
    ]

    const result = sortSecurityGroups(itemsWithNull, "value", "desc")
    // In desc order: 100, 50, null (null still goes to the end)
    expect(result.map((item) => item.id)).toEqual(["2", "3", "1"])
  })

  it("does not mutate original array", () => {
    const original = [...mockSecurityGroups]
    sortSecurityGroups(mockSecurityGroups, "name", "asc")
    expect(mockSecurityGroups).toEqual(original)
  })

  it("defaults to ascending order when sortDir is not specified", () => {
    const result = sortSecurityGroups(mockSecurityGroups, "name")
    expect(result.map((sg) => sg.name)).toEqual(["alpha", "beta", "zebra"])
  })
})

describe("applyMarkerPagination", () => {
  const mockItems = [
    { id: "sg-1", name: "alpha" },
    { id: "sg-2", name: "beta" },
    { id: "sg-3", name: "gamma" },
    { id: "sg-4", name: "delta" },
    { id: "sg-5", name: "epsilon" },
  ]

  it("returns all items when no marker or limit is provided", () => {
    const result = applyMarkerPagination(mockItems)
    expect(result).toEqual(mockItems)
  })

  it("applies limit without marker", () => {
    const result = applyMarkerPagination(mockItems, undefined, 3)
    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual(["sg-1", "sg-2", "sg-3"])
  })

  it("returns items after marker", () => {
    const result = applyMarkerPagination(mockItems, "sg-2")
    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual(["sg-3", "sg-4", "sg-5"])
  })

  it("returns items after marker with limit", () => {
    const result = applyMarkerPagination(mockItems, "sg-1", 2)
    expect(result).toHaveLength(2)
    expect(result.map((item) => item.id)).toEqual(["sg-2", "sg-3"])
  })

  it("returns items before marker with page_reverse", () => {
    const result = applyMarkerPagination(mockItems, "sg-4", undefined, true)
    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual(["sg-1", "sg-2", "sg-3"])
  })

  it("returns items before marker with page_reverse and limit", () => {
    const result = applyMarkerPagination(mockItems, "sg-4", 2, true)
    expect(result).toHaveLength(2)
    expect(result.map((item) => item.id)).toEqual(["sg-2", "sg-3"])
  })

  it("returns empty array when marker is not found", () => {
    const result = applyMarkerPagination(mockItems, "sg-nonexistent")
    expect(result).toEqual([])
  })

  it("returns empty array when marker is first item with page_reverse", () => {
    const result = applyMarkerPagination(mockItems, "sg-1", undefined, true)
    expect(result).toEqual([])
  })

  it("returns empty array when marker is last item", () => {
    const result = applyMarkerPagination(mockItems, "sg-5")
    expect(result).toEqual([])
  })

  it("handles limit larger than available items", () => {
    const result = applyMarkerPagination(mockItems, "sg-3", 10)
    expect(result).toHaveLength(2)
    expect(result.map((item) => item.id)).toEqual(["sg-4", "sg-5"])
  })

  it("handles zero limit", () => {
    // limit=0 means no limit, return all items (OpenStack behavior)
    const result = applyMarkerPagination(mockItems, undefined, 0)
    expect(result).toEqual(mockItems)
  })

  it("does not mutate original array", () => {
    const original = [...mockItems]
    applyMarkerPagination(mockItems, "sg-2", 2)
    expect(mockItems).toEqual(original)
  })
})

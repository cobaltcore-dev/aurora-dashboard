import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { SecurityGroupErrorHandlers } from "./securityGroupHelpers"

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

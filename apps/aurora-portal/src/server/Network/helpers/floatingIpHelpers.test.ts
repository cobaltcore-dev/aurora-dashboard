import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { FloatingIpErrorHandlers } from "./floatingIpHelpers"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

describe("FloatingIpErrorHandlers.list", () => {
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.list({ status: 500, statusText: "Internal Server Error" })
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process Floating IP: Internal Server Error")
  })
})

describe("FloatingIpErrorHandlers.get", () => {
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.get({ status: 500, statusText: "Internal Server Error" }, "fip-test-123")
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process fip-test-123: Internal Server Error")
  })
})

describe("FloatingIpErrorHandlers.update", () => {
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.update({ status: 500, statusText: "Internal Server Error" }, "fip-test-123")
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process fip-test-123: Internal Server Error")
  })
})

describe("FloatingIpErrorHandlers.create", () => {
  it("should return BAD_REQUEST error for 400 status", () => {
    const response = { status: 400, statusText: "Bad Request" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[400])
    expect(error.message).toBe("Invalid request data for creating floating IP")
  })

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[401])
    expect(error.message).toBe("Unauthorized access to create floating IP")
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
    expect(error.message).toBe("Specified resource not found for creating floating IP")
  })

  it("should return CONFLICT error for 409 status", () => {
    const response = { status: 409, statusText: "Conflict" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
    expect(error.message).toBe("Conflict - resource already exists or is in use for creating floating IP")
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to create floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to create floating IP: Unknown error")
  })
})

describe("FloatingIpErrorHandlers.delete", () => {
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.delete({ status: 500, statusText: "Internal Server Error" }, "fip-test-789")
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process fip-test-789: Internal Server Error")
  })
})

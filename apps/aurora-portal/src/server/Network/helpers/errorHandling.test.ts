import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import { ErrorHandler } from "./errorHandling"

describe("ErrorHandler for List procedures", () => {
  it("returns UNAUTHORIZED for 401", () => {
    const list = ErrorHandler("Port")
    const error = list({ status: 401, statusText: "Unauthorized" })

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[401])
    expect(error.message).toBe("Unauthorized access to Port: Unauthorized")
  })

  it("returns FORBIDDEN for 403", () => {
    const list = ErrorHandler("Network")
    const error = list({ status: 403, statusText: "Forbidden" })

    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
    expect(error.message).toBe("Access forbidden to Network: Forbidden")
  })

  it("returns default error for unhandled status", () => {
    const list = ErrorHandler("Floating IP")
    const error = list({ status: 500, statusText: "Internal Server Error" })

    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch Floating IP: Internal Server Error")
  })

  it("uses Unknown error when statusText is missing", () => {
    const list = ErrorHandler("Port")
    const error = list({ status: 503 })

    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch Port: Unknown error")
  })
})

describe("ErrorHandler for Get procedures", () => {
  const floatingIpId = "fip-test-123"
  const get = ErrorHandler("Floating IP")

  it("returns UNAUTHORIZED for 401", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[401])
    expect(error.message).toBe(`Unauthorized access to ${floatingIpId}: Unauthorized`)
  })

  it("returns FORBIDDEN for 403", () => {
    const response = { status: 403, statusText: "Forbidden" }
    const error = get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
    expect(error.message).toBe(`Access forbidden to ${floatingIpId}: Forbidden`)
  })

  it("returns NOT_FOUND for 404", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
    expect(error.message).toBe(`${floatingIpId} not found: Not Found`)
  })

  it("returns default error for unhandled status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe(`Failed to fetch ${floatingIpId}: Internal Server Error`)
  })

  it("returns Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe(`Failed to fetch ${floatingIpId}: Unknown error`)
  })

  it("includes resource ID in error messages", () => {
    const customId = "fip-custom-456"
    const response = { status: 404, statusText: "Not Found" }
    const error = get(response, customId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
    expect(error.message).toContain(customId)
  })
})

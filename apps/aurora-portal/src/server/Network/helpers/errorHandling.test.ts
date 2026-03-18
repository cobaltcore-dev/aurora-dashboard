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
    expect(error.message).toBe("Unauthorized access")
  })

  it("returns FORBIDDEN for 403", () => {
    const list = ErrorHandler("Network")
    const error = list({ status: 403, statusText: "Forbidden" })

    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
    expect(error.message).toBe("Access forbidden: Forbidden")
  })

  it("returns default error for unhandled status", () => {
    const list = ErrorHandler("Floating IP")
    const error = list({ status: 500, statusText: "Internal Server Error" })

    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Floating IP: Internal Server Error")
  })

  it("uses Unknown error when statusText is missing", () => {
    const list = ErrorHandler("Port")
    const error = list({ status: 503 })

    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Port: Unknown error")
  })
})

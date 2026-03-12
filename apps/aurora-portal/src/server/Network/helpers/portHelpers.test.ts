import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_CODE_TO_NAME } from "./index"
import { PortErrorHandlers } from "./portHelpers"

describe("PortErrorHandlers.list", () => {
  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = PortErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe("Unauthorized access")
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = PortErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = PortErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Unknown error")
  })

  it("should return INTERNAL_SERVER_ERROR for any unhandled status code", () => {
    const response = { status: 503, statusText: "Service Unavailable" }
    const error = PortErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Service Unavailable")
  })
})

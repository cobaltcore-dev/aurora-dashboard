import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { validateNetworkService, FloatingIpErrorHandlers } from "./floatingIpHelpers"

describe("validateNetworkService", () => {
  it("should not throw when network service is available", () => {
    const mockNetwork = { get: () => {}, del: () => {} }
    expect(() => validateNetworkService(mockNetwork)).not.toThrow()
  })

  it("should throw INTERNAL_SERVER_ERROR when network service is null", () => {
    expect(() => validateNetworkService(null)).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR when network service is undefined", () => {
    expect(() => validateNetworkService(undefined)).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })
})

describe("FloatingIpErrorHandlers.list", () => {
  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Unauthorized access")
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to fetch list: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to fetch list: Unknown error")
  })

  it("should return INTERNAL_SERVER_ERROR for any unhandled status code", () => {
    const response = { status: 503, statusText: "Service Unavailable" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to fetch list: Service Unavailable")
  })
})

describe("FloatingIpErrorHandlers.get", () => {
  const floatingIpId = "fip-test-123"

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe(`Unauthorized access: ${floatingIpId}`)
  })

  it("should return FORBIDDEN error for 403 status", () => {
    const response = { status: 403, statusText: "Forbidden" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toBe(`Access forbidden to floating IP: ${floatingIpId}`)
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe(`Floating IP not found: ${floatingIpId}`)
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to fetch floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to fetch floating IP: Unknown error")
  })

  it("should include floating IP ID in error messages", () => {
    const customId = "fip-custom-456"
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.get(response, customId)

    expect(error.message).toContain(customId)
  })
})

describe("FloatingIpErrorHandlers.delete", () => {
  const floatingIpId = "fip-test-789"

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe(`Unauthorized access: ${floatingIpId}`)
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe(`Floating IP not found: ${floatingIpId}`)
  })

  it("should return CONFLICT error for 412 status (Precondition Failed)", () => {
    const response = { status: 412, statusText: "Precondition Failed" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toBe(`Precondition failed - revision number mismatch: ${floatingIpId}`)
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to delete floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(error.message).toBe("Failed to delete floating IP: Unknown error")
  })

  it("should include floating IP ID in error messages", () => {
    const customId = "fip-custom-999"
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.delete(response, customId)

    expect(error.message).toContain(customId)
  })
})

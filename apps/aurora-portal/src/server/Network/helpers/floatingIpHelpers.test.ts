import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { FloatingIpErrorHandlers } from "./floatingIpHelpers"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_CODE_TO_NAME } from "./index"

describe("FloatingIpErrorHandlers.list", () => {
  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe("Unauthorized access")
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Unknown error")
  })

  it("should return INTERNAL_SERVER_ERROR for any unhandled status code", () => {
    const response = { status: 503, statusText: "Service Unavailable" }
    const error = FloatingIpErrorHandlers.list(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Service Unavailable")
  })
})

describe("FloatingIpErrorHandlers.create", () => {
  it("should return BAD_REQUEST error for 400 status", () => {
    const response = { status: 400, statusText: "Bad Request" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[400])
    expect(error.message).toBe("Invalid request data for creating floating IP")
  })

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe("Unauthorized access to create floating IP")
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[404])
    expect(error.message).toBe("Specified resource not found for creating floating IP")
  })

  it("should return CONFLICT error for 409 status", () => {
    const response = { status: 409, statusText: "Conflict" }
    const error = FloatingIpErrorHandlers.create(response)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[409])
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

describe("FloatingIpErrorHandlers.get", () => {
  const floatingIpId = "fip-test-123"

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe(`Unauthorized access: ${floatingIpId}`)
  })

  it("should return FORBIDDEN error for 403 status", () => {
    const response = { status: 403, statusText: "Forbidden" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[403])
    expect(error.message).toBe(`Access forbidden to floating IP: ${floatingIpId}`)
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[404])
    expect(error.message).toBe(`Floating IP not found: ${floatingIpId}`)
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.get(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch floating IP: Unknown error")
  })

  it("should include floating IP ID in error messages", () => {
    const customId = "fip-custom-456"
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.get(response, customId)

    expect(error.message).toContain(customId)
  })
})

describe("FloatingIpErrorHandlers.update", () => {
  const floatingIpId = "fip-test-456"

  it("should return BAD_REQUEST error for 400 status", () => {
    const response = { status: 400, statusText: "Bad Request" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[400])
    expect(error.message).toBe(`Invalid request data for floating IP: ${floatingIpId}`)
  })

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe(`Unauthorized access: ${floatingIpId}`)
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[404])
    expect(error.message).toBe(`Floating IP not found: ${floatingIpId}`)
  })

  it("should return CONFLICT error for 409 status", () => {
    const response = { status: 409, statusText: "Conflict" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[409])
    expect(error.message).toBe(`Conflict - floating IP is in use: ${floatingIpId}`)
  })

  it("should return PRECONDITION_FAILED error for 412 status", () => {
    const response = { status: 412, statusText: "Precondition Failed" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[412])
    expect(error.message).toBe(`Precondition failed - revision number mismatch: ${floatingIpId}`)
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to update floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.update(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to update floating IP: Unknown error")
  })
})

describe("FloatingIpErrorHandlers.delete", () => {
  const floatingIpId = "fip-test-789"

  it("should return UNAUTHORIZED error for 401 status", () => {
    const response = { status: 401, statusText: "Unauthorized" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[401])
    expect(error.message).toBe(`Unauthorized access: ${floatingIpId}`)
  })

  it("should return NOT_FOUND error for 404 status", () => {
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[404])
    expect(error.message).toBe(`Floating IP not found: ${floatingIpId}`)
  })

  it("should return PRECONDITION_FAILED error for 412 status (Precondition Failed)", () => {
    const response = { status: 412, statusText: "Precondition Failed" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[412])
    expect(error.message).toBe(`Precondition failed - revision number mismatch: ${floatingIpId}`)
  })

  it("should return INTERNAL_SERVER_ERROR for 500 status", () => {
    const response = { status: 500, statusText: "Internal Server Error" }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to delete floating IP: Internal Server Error")
  })

  it("should return INTERNAL_SERVER_ERROR with Unknown error when statusText is missing", () => {
    const response = { status: 503 }
    const error = FloatingIpErrorHandlers.delete(response, floatingIpId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to delete floating IP: Unknown error")
  })

  it("should include floating IP ID in error messages", () => {
    const customId = "fip-custom-999"
    const response = { status: 404, statusText: "Not Found" }
    const error = FloatingIpErrorHandlers.delete(response, customId)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_CODE_TO_NAME[404])
    expect(error.message).toContain(customId)
  })
})

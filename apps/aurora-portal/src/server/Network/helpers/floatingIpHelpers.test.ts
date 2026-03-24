import { describe, it, expect } from "vitest"
import { FloatingIpErrorHandlers } from "./floatingIpHelpers"
import { DEFAULT_ERROR_NAME } from "./index"

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
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.create({ status: 500, statusText: "Internal Server Error" })
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process Floating IP: Internal Server Error")
  })
})

describe("FloatingIpErrorHandlers.delete", () => {
  it("is wired to shared error handler", () => {
    const error = FloatingIpErrorHandlers.delete({ status: 500, statusText: "Internal Server Error" }, "fip-test-789")
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to process fip-test-789: Internal Server Error")
  })
})

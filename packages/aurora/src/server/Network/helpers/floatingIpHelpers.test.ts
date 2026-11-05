import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { FloatingIpErrorHandlers, rethrowFloatingIpCreateError } from "./floatingIpHelpers"
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

describe("rethrowFloatingIpCreateError", () => {
  it("surfaces the OpenStack reason for a 400 as a BAD_REQUEST", () => {
    const apiError = new SignalOpenstackApiError(
      "Bad floatingip request: dns_name cannot be specified without a dns_domain.",
      400
    )

    expect(() => rethrowFloatingIpCreateError(apiError)).toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Failed to allocate floating IP: Bad floatingip request: dns_name cannot be specified without a dns_domain.",
      })
    )
  })

  it("does NOT forward the SignalOpenstackApiError as cause (so the shared middleware keeps the message)", () => {
    const apiError = new SignalOpenstackApiError("Bad floatingip request", 400)

    try {
      rethrowFloatingIpCreateError(apiError)
      expect.unreachable("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError)
      expect((error as TRPCError).cause).toBeUndefined()
    }
  })

  it("falls back to a generic message when the 400 has no reason", () => {
    const apiError = new SignalOpenstackApiError("   ", 400)

    expect(() => rethrowFloatingIpCreateError(apiError)).toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Failed to allocate floating IP." })
    )
  })

  it("re-throws non-400 OpenStack errors unchanged for the shared middleware to map", () => {
    const apiError = new SignalOpenstackApiError("Unauthorized", 401)

    expect(() => rethrowFloatingIpCreateError(apiError)).toThrow(apiError)
  })

  it("re-throws non-OpenStack errors unchanged", () => {
    const genericError = new Error("socket hang up")

    expect(() => rethrowFloatingIpCreateError(genericError)).toThrow(genericError)
  })
})

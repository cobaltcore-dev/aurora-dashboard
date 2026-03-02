import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { validateOpenstackService } from "./validateOpenstackService"

describe("validateOpenstackService", () => {
  it("should not throw when service is available", () => {
    const mockService = { get: () => {}, post: () => {} }
    expect(() => validateOpenstackService(mockService, "network")).not.toThrow()
  })

  it("should throw INTERNAL_SERVER_ERROR when service is null", () => {
    expect(() => validateOpenstackService(null, "network")).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("should throw INTERNAL_SERVER_ERROR when service is undefined", () => {
    expect(() => validateOpenstackService(undefined, "compute")).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Compute service is not available",
      })
    )
  })

  it("should capitalize service name in error message", () => {
    expect(() => validateOpenstackService(null, "glance")).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Glance service is not available",
      })
    )
  })

  it("should work with different service names", () => {
    const services = ["network", "compute", "glance", "storage", "swift"]
    services.forEach((serviceName) => {
      expect(() => validateOpenstackService(null, serviceName)).toThrow(TRPCError)
    })
  })

  it("should preserve service type after validation", () => {
    const mockService = { get: () => "test", del: () => "delete" }
    validateOpenstackService(mockService, "network")
    // After validation, TypeScript knows mockService is not null/undefined
    expect(mockService.get()).toBe("test")
    expect(mockService.del()).toBe("delete")
  })
})

import { describe, it, expect, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type { AuroraPortalContext } from "@/server/context"
import { getNetworkService, parseOrThrow } from "./index"

describe("parseOrThrow", () => {
  const schema = z.object({ id: z.string(), name: z.string() })

  it("returns parsed data when input is valid", () => {
    const data = { id: "abc", name: "test" }
    const result = parseOrThrow(schema, data, "testRouter.procedure")
    expect(result).toEqual(data)
  })

  it("throws PARSE_ERROR with context in message when input is invalid", () => {
    expect(() => parseOrThrow(schema, { invalid: "data" }, "testRouter.procedure")).toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in testRouter.procedure",
      })
    )
  })

  it("logs the Zod error details on parse failure", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    parseOrThrow(schema, { invalid: "data" }, "testRouter.procedure")

    expect(consoleErrorSpy).toHaveBeenCalledWith("Zod Parsing Error in testRouter.procedure:", expect.anything())

    consoleErrorSpy.mockRestore()
  })

  it("preserves branded types in the returned value", () => {
    const brandedSchema = z.object({ ts: z.string().brand("ISO8601Timestamp") })
    const result = parseOrThrow(brandedSchema, { ts: "2026-01-01T00:00:00Z" }, "ctx")
    expect(result.ts).toBe("2026-01-01T00:00:00Z")
  })
})

describe("getNetworkService", () => {
  it("returns network service when available", () => {
    const mockNetworkService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
    }

    const serviceFn = vi.fn((serviceName: string) => {
      if (serviceName === "network") {
        return mockNetworkService
      }
      return null
    })

    const mockContext = {
      openstack: {
        service: serviceFn,
      },
    } as unknown as AuroraPortalContext

    const result = getNetworkService(mockContext)

    expect(result).toBe(mockNetworkService)
    expect(serviceFn).toHaveBeenCalledWith("network")
  })

  it("throws TRPCError when network service is null", () => {
    const mockContext = {
      openstack: {
        service: vi.fn().mockReturnValue(null),
      },
    } as unknown as AuroraPortalContext

    expect(() => getNetworkService(mockContext)).toThrow(TRPCError)
    expect(() => getNetworkService(mockContext)).toThrow("Network service is not available")
  })

  it("throws TRPCError when network service is undefined", () => {
    const mockContext = {
      openstack: {
        service: vi.fn().mockReturnValue(undefined),
      },
    } as unknown as AuroraPortalContext

    expect(() => getNetworkService(mockContext)).toThrow(TRPCError)
    expect(() => getNetworkService(mockContext)).toThrow("Network service is not available")
  })

  it("throws TRPCError when openstack session is undefined", () => {
    const mockContext = {
      openstack: undefined,
    } as unknown as AuroraPortalContext

    expect(() => getNetworkService(mockContext)).toThrow(TRPCError)
    expect(() => getNetworkService(mockContext)).toThrow("Network service is not available")
  })

  it("throws TRPCError when openstack session is null", () => {
    const mockContext = {
      openstack: null,
    } as unknown as AuroraPortalContext

    expect(() => getNetworkService(mockContext)).toThrow(TRPCError)
    expect(() => getNetworkService(mockContext)).toThrow("Network service is not available")
  })
})

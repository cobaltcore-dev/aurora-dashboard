import { describe, it, expect, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { getNetworkService } from "./networkHelpers"
import type { AuroraPortalContext } from "@/server/context"

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
